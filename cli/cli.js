var Ndt7 = require('../index.js')
var clc = require("cli-color");
var speed = 0
var output_string = ""
var speed_test_banner = "NDT7 client"

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
    speed = value.toFixed(3)
}

function on_serverMeasurement(value) {
    output_string = "Download speed: "+speed+" Mbit/s\r\n"
    output_string += "Max bandwidth: "+value["max_bandwidth"].toFixed(3)+" Mbit/s\r\n";
    output_string += "Min RTT: "+value["min_rtt"]+" ms\r\n";
    output_string += "Smoothed RTT: "+value["smoothed_rtt"]+" ms\r\n";
    output_string += "RTT variance: "+value["rtt_var"]+" ms\r\n";
    process.stdout.write(clc.erase.screen);
    process.stdout.write(clc.reset);
    clc.move.top;
    var banner = clc.xterm(61).bgXterm(232).bold;
    console.log(banner(speed_test_banner));
    var msg = clc.xterm(178).bgXterm(0);
    console.log(msg(output_string));
    clc.move.top;
}

function on_finish(value) {
    process.stdout.write(clc.reset);
    var banner = clc.xterm(61).bgXterm(232).bold;
    console.log(banner(speed_test_banner));
    var msg = clc.green.bgXterm(0);
    console.log(msg(output_string));
    console.log(msg("TEST FINISHED!!!!"));
}

var ndt7 = new Ndt7()
ndt7.on("open", on_open)
ndt7.on("error", on_error)
ndt7.on("selectedServer", on_selectedServer)
ndt7.on("serverMeasurement",on_serverMeasurement)
ndt7.on("clientMeasurement", on_clientMeasurement)
ndt7.on("close", on_finish)
ndt7.start()