/* jshint esversion: 6, asi: true */
/* exported libndt7 */

// libndt7-core is a ndt7 client library in JavaScript. You typically want
// to run ndt7 using a web worker; see libndt7-worker.js.

// libndt7 is the namespace for ndt7.
var WebSocket = require('faye-websocket')
var fetch = require('node-fetch');
fetch.Promise = require('bluebird');
var _url = require('url');
var URLSearchParams = require('@ungap/url-search-params')
var settings = require('./settings.json');
var crypto = require('crypto');

module.exports.libndt7 = (function () {
  'use strict'
  // events groups all events
  var events = {
    // open is the event emitted when the socket is opened. The
    // object bound to this event is always null.
    open: 'ndt7.open',

    // close is the event emitted when the socket is closed. The
    // object bound to this event is always null. The code SHOULD
    // always emit this event at the end of the test.
    close: 'ndt7.close',

    // error is the event emitted when the socket is closed. The
    // object bound to this event is always null.
    error: 'ndt7.error',

    // serverMeasurement is a event emitted periodically during a
    // ndt7 download. It represents a measurement performed by the
    // server and sent to us over the WebSocket channel.
    serverMeasurement: 'ndt7.measurement.server',

    // clientMeasurement is a event emitted periodically during a
    // ndt7 download. It represents a measurement performed by the client.
    clientMeasurement: 'ndt7.measurement.client',

    // selectedServer is emitted once when we've selected a server.
    selectedServer: 'ndt7.selected_server'
  }

  var version = 0.8

  return {
    // version is the client library version.
    version: version,

    // events exports the events table.
    events: events,

    // newClient creates a new ndt7 client with |settings|.
    newClient: function () {
      var funcs = {}

      // emit emits the |value| event identified by |key|.
      var emit = function (key, value) {
        if (funcs.hasOwnProperty(key)) {
          funcs[key](value)
        }
      }

      // generate random values in array
      var getRandomValues = function (buf) {
        if (crypto.randomBytes) {
          var bytes = crypto.randomBytes(buf.length);
          buf.set(bytes);
          return buf;
        } else {
          throw new Error('No secure random number generator available.');
        }
      }

      // makeurl creates the url from |settings| and |subtest| name.
      var makeurl = function (settings, subtest) {
        var string_url = 'wss://' + settings.hostname
        try {
          var url = new _url.URL(string_url);
        } catch (e) {
          var url = new _url.Url()
          url.parse(string_url)
        }
        url.pathname = '/ndt/v7/' + subtest
        var params = new URLSearchParams()
        settings.meta = (settings.meta !== undefined) ? settings : {}
        settings.meta['library.name'] = 'libndt7.js'
        settings.meta['library.version'] = version
        for (var key in settings.meta) {
          if (settings.meta.hasOwnProperty(key)) {
            params.append(key, settings.meta[key])
          }
        }
        url.search = params.toString()
        var url_toString = _url.format(url)
        return url_toString
      }

      // setupconn creates the WebSocket connection and initializes all
      // the event handlers except for the message handler and, when
      // uploading, the connect handler. To setup the WebSocket connection
      // we use the |settings| and the |subtest| arguments.
      var setupconn = function (settings, subtest) {
        var url = makeurl(settings, subtest)
        var socket = new WebSocket.Client(url, ['net.measurementlab.ndt.v7'])
        if (subtest === 'download') {
          socket.on('open', function (event) {
            emit(events.open, 'download')
          })
        }
        socket.on('close', function (event) {
          emit(events.close, null)
        })
        socket.on('error', function (event) {
          emit(events.error, null)
        })
        return socket
      }

      // download measures the download speed using |socket|. To this end, it
      // sets the message handlers of |socket|.
      var download = function (socket) {
        var count = 0
        var t0 = new Date().getTime()
        var tlast = t0
        socket.on('message', function (event) {
          if (event.data instanceof Buffer) {
            count += event.data.length
          } else {
            emit(events.serverMeasurement, JSON.parse(event.data))
            count += event.data.length
          }
          var t1 = new Date().getTime()
          var every = 250 // millisecond
          if (t1 - tlast > every) {
            emit(events.clientMeasurement, {
              elapsed: (t1 - t0) / 1000, // second
              app_info: {
                num_bytes: count
              }
            })
            tlast = t1
          }
        })
      }

      // uploader performs the read upload.
      var uploader = function (socket, data, t0, tlast, count, iteration) {
        var t1 = new Date().getTime()
        var duration = 10000 // millisecond
        var every = 1000 // millisecond
        if (t1 - t0 > duration) {
          clearImmediate(timeoutObj);
          socket.close();
          return
        }
        // TODO(bassosimone): refine to ensure this works well across a wide
        // range of CPU speed/network speed/browser combinations
        var underbuffered = 7 * data.length
        while (socket.bufferedAmount < underbuffered) {
          socket.send(data)
          count += data.length
        }
        if (t1 - tlast > every) {
          emit(events.clientMeasurement, {
            elapsed: (t1 - t0) / 1000, // second
            app_info: {
              num_bytes: count
            }
          })
          tlast = t1
        }
        var timeoutObj = setTimeout(function () {
          uploader(socket, data, t0, tlast, count)
        }, 0)
      }

      // upload measures the upload speed using |socket|. To this end, it
      // sets the message and open handlers of |socket|.
      var upload = function (socket) {
        socket.on('message', function (event) {
          emit(events.serverMeasurement, JSON.parse(event.data))
        })
        socket.on('open', function (event) {
          emit(events.open, null)
          var data = new Uint8Array(1 << 13)
          getRandomValues(data)
          socket.binarytype = 'arraybuffer'
          var t0 = new Date().getTime()
          var tlast = t0
          uploader(socket, data, t0, tlast, 0)
        })
      }

      // discoverHostname ensures settings.hostname is not empty, using
      // mlab-ns to find out a suitable hostname if needed.
      var discoverHostname = function (settings, callback) {
        if (settings.hostname !== '') {
          // Allow the user to specify a simplified hostname.
          var re = /^mlab[1-9]{1}-[a-z]{3}[0-9]{2}$/
          if (settings.hostname.match(re)) {
            settings.hostname = "ndt-iupui-" + settings.hostname + ".measurement-lab.org"
          }
          emit(events.selectedServer, settings.hostname)
          callback(settings)
          return
        }
        // Implementation note: using the geo_options policy because in some
        // sites, e.g. Turin, there is no mlab4. Using a testing mlabns service
        // that returns us also the mlab4 sites if available. Of course, this
        // will need to change when m-lab/ndt-server is widely deployed.
        fetch('https://locate-dot-mlab-staging.appspot.com/ndt_ssl?policy=geo_options')
          .then(function (response) {
            return response.json()
          })
          .then(function (doc) {
            for (var i = 0; i < doc.length; ++i) {
              var fqdn = doc[i].fqdn
              if (fqdn.indexOf("-mlab4-") !== -1) {
                settings.hostname = fqdn
                emit(events.selectedServer, settings.hostname)
                callback(settings)
                return
              }
            }
            throw "Cannot find a suitable mlab server"
          })
      }

      return {
        // on is a publicly exported function that allows to set a handler
        // for a specific event emitted by this library. |key| is the handler
        // name. |handler| is a callable function.
        on: function (key, handler) {
          funcs[key] = handler
        },

        // startDownload starts the ndt7 download.
        startDownload: function () {
          discoverHostname(settings, function (settings) {
            download(setupconn(settings, 'download'))
          })
        },

        // startUpload starts the ndt7 upload.
        startUpload: function () {
          discoverHostname(settings, function (settings) {
            upload(setupconn(settings, 'upload'))
          })
        }
      }
    }
  }
})