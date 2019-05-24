#! /usr/bin/env node

var Ndt7 = require('../index.js')
var clc = require("cli-color");
var output_string = ""
var NDT7_BANNER = "NDT7 client"

function on_open(value) {
    console.log("Opening connection")
}

function on_error(value) {
    console.log("Error: "+value)
    process.exit();
}

function on_selectedServer(value) {
    speed_test_banner += " connected with server "+value+" \n"
    console.log("Selecting best Mlab server "+value)
}

function on_clientMeasurement(value) {
    speed = value["download_speed"].toFixed(3)
}

function on_clientMeasurement_upload(value) {
   var complete_string = output_string + ("Upload speed: "+value["upload_speed"].toFixed(3)+" Mbit/s\r\n");
   process.stdout.write(clc.erase.screen);
   process.stdout.write(clc.reset);
   clc.move.top;
   var banner = clc.xterm(61).bgXterm(232).bold;
   console.log(banner(NDT7_BANNER));
   var msg = clc.xterm(178).bgXterm(0);
   console.log(msg(complete_string));
   clc.move.top;
}

function on_serverMeasurement(value) {
   output_string = "Download speed: "+speed+" Mbit/s\r\n"
    output_string += "Max bandwidth: "+value["max_bandwidth"].toFixed(3)+" Mbit/s\r\n";
    output_string += "Min RTT: "+value["min_rtt"]+" ms\r\n";
    output_string += "Smoothed RTT: "+value["smoothed_rtt"]+" ms\r\n";
    output_string += "RTT variance: "+value["rtt_var"]+" ms\r\n";
    output_string += "RTT variance: "+value["rtt_var"]+" ms\r\n";
    var complete_string = output_string + ("Upload speed: N/A Mbit/s\r\n");
    process.stdout.write(clc.erase.screen);
    process.stdout.write(clc.reset);
    clc.move.top;
    var banner = clc.xterm(61).bgXterm(232).bold;
    console.log(banner(NDT7_BANNER));
    var msg = clc.xterm(178).bgXterm(0);
    console.log(msg(complete_string));
    clc.move.top;
}

function on_finish(value) {
    process.stdout.write(clc.reset);
    var banner = clc.xterm(61).bgXterm(232).bold;
    console.log(banner(NDT7_BANNER));
    var msg = clc.green.bgXterm(0);
    output_string += "Upload speed: "+value["upload_speed"].toFixed(3)+" Mbit/s\r\n"
    console.log(msg(output_string));
    console.log(msg("TEST FINISHED!!!!"));
}

var ndt7 = new Ndt7()
ndt7.on("error", on_error)
ndt7.on("selectedServer", on_selectedServer)
ndt7.on("serverMeasurement",on_serverMeasurement)
ndt7.on("clientMeasurement", on_clientMeasurement)
ndt7.on("clientMeasurementUpload", on_clientMeasurement_upload)
ndt7.on("finished", on_finish)
ndt7.start()
