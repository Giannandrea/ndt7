var libndt7 = require('./lib/libndt7-core.js')
var clnt = libndt7.libndt7().newClient()

function Ndt7() {

  var results = {
    download_speed: 0,
    max_bandwidth: 0,
    min_rtt: 0,
    smoothed_rtt: 0,
    rtt_var: 0
  }

  var custom_callbacks = {
    serverMeasurement: null,
    clientMeasurement: null
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
        clnt.on(libndt7.libndt7().events.close, on_finish)
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
    var download_speed = 8 * value["app_info"]["num_bytes"] / value["elapsed"] / 1000 / 1000
    if (custom_callbacks.clientMeasurement)
      eval(custom_callbacks.clientMeasurement)(download_speed)
    return download_speed
  }

  function on_finish(value) {
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
    if (key == "serverMeasurement" || key == "clientMeasurement") {
      custom_callbacks[key] = callback
      return
    }
    clnt.on(libndt7.libndt7().events[key], callback)
  }
}
module.exports = Ndt7;