var libndt7 = require('./lib/libndt7-core.js')
var clnt = libndt7.libndt7().newClient()

function Ndt7() {

  var results = {
    download_speed: 0,
    max_bandwidth: 0,
    min_rtt: 0,
    smoothed_rtt: 0,
    rtt_var: 0,
    upload_speed: 0
  }

  var test_progress = {
    download_test: true,
    upload_test: true
  }

  var custom_callbacks = {
    serverMeasurement: null,
    clientMeasurement: null,
    clientMeasurementUpload: null,
    open: null,
    finished: null
  }

  function init_callback(value, index, array) {
    switch(value) {
      case "serverMeasurement":
        clnt.on(libndt7.libndt7().events.serverMeasurement, on_serverMeasurement)
        break;
      case "clientMeasurement":
        clnt.on(libndt7.libndt7().events.clientMeasurement, on_clientMeasurement)
        break;
      case "close":
        clnt.on(libndt7.libndt7().events.close, on_close)
        break;
      case "open":
        clnt.on(libndt7.libndt7().events.open, on_open)
        break;
      default:
        clnt.on(libndt7.libndt7().events[value], on_handler)
    }
  }

  //Iterate on events and propagate only events defined by user
  var events = libndt7.libndt7().events
  Object.keys(events).map(init_callback)

  function on_serverMeasurement(value) {
    results["max_bandwidth"] = (value["bbr_info"]["max_bandwidth"] / 1000 / 1000)
    results["min_rtt"] = value["bbr_info"]["min_rtt"]
    results["smoothed_rtt"] = value["tcp_info"]["smoothed_rtt"]
    results["rtt_var"] = value["tcp_info"]["rtt_var"]
    if (custom_callbacks.serverMeasurement)
      eval(custom_callbacks.serverMeasurement)(results)
    return results
  }

  function on_clientMeasurement(value) {
    var speed = 8 * value["app_info"]["num_bytes"] / value["elapsed"] / 1000 / 1000
    if (custom_callbacks.clientMeasurement && test_progress.download_test) {
      results["download_speed"] = speed
      eval(custom_callbacks.clientMeasurement)(results)
      return
    }
    if (custom_callbacks.clientMeasurementUpload && test_progress.upload_test) {
      results["upload_speed"] = speed
      eval(custom_callbacks.clientMeasurementUpload)(results)
      return
    }
    return speed
  }

  function on_open(value) {
    if (custom_callbacks.oepn)
      eval(custom_callbacks.open)(value)
    return value
  }

  function on_close(value) {
    if (test_progress.download_test) {
      test_progress.download_test = false;
      clnt.startUpload();
      return
    } else {
      test_progress.upload_test = false
      if (custom_callbacks.finished)
        eval(custom_callbacks.finished)(results)
    }
    return results;
  }

  function on_handler(value) {
    return
  }

  Ndt7.prototype.start = function () {
    clnt.startDownload();
    return
  }

  Ndt7.prototype.on = function (key, callback) {
      custom_callbacks[key] = callback
      return
  }
}
module.exports = Ndt7;