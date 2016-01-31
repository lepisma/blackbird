// Main script
// -----------

var blackbird = blackbird || {};

window.$ = window.jQuery = require("jquery");
window.d3 = require("d3");
var ui = require("./app/js/ui");
require("jquery-ui");
var restify = require("restify");

blackbird.config = require("./app/js/config");
blackbird.Player = require("./app/js/player");
blackbird.ipc = require("electron").ipcRenderer;
blackbird.api = restify.createServer();

blackbird.player = new blackbird.Player(blackbird.config, function() {
    // Create seek slider
    $("#seek-bar").slider({
        min: 0,
        max: 100,
        value: 0,
        range: "min",
        animate: true,
        slide: function(event, ele) {
            blackbird.player.seek(ele.value);
        }
    });

    // Create visualizer
    ui.initVisualizer(blackbird.player);

    // Hot start scatter
    blackbird.player.genCoords(function() {
        ui.initScatter(blackbird.player);
        ui.plotScatter(blackbird.player,
                       blackbird.player.sequence[blackbird.player.currentIndex],
                      true);
    });

    // First play
    blackbird.player.next();

    // Setup api points
    blackbird.api.get("/current", function(req, res, next) {
        res.send(blackbird.player.currentData);
        next();
    });

    blackbird.api.get("/next", function(req, res, next) {
        blackbird.player.next();
        res.send("ok");
        next();
    });

    blackbird.api.get("/previous", function(req, res, next) {
        blackbird.player.previous();
        res.send("ok");
        next();
    });

    blackbird.api.get("/play", function(req, res, next) {
        blackbird.player.pause(function(playState) {
            ui.updatePlayPause(playState);
        });
        res.send("ok");
        next();
    });

    blackbird.api.listen(blackbird.config.api_port);
});

// Player control logic
$("#prev-btn").click(function() {
    blackbird.player.previous();
});

$("#next-btn").click(function() {
    blackbird.player.next();
});

$("#play-btn").click(function() {
    blackbird.player.pause(function(playState) {
        ui.updatePlayPause(playState);
    });
});

// Global keybindings
blackbird.ipc.on("ping", function(event, arg) {
    switch (arg) {
    case "play-pause":
        blackbird.player.pause(function(playState) {
            ui.updatePlayPause(playState);
        });
        break;
    case "next":
        blackbird.player.next();
        break;
    case "prev":
        blackbird.player.previous();
        break;
    }
});

// Command line entry
$(document).keydown(function(e) {
    if (e.keyCode==88 && e.altKey) {
        $("#command-input").val("");
        $("#command-input").focus();
    }
});

// Command line
$(document).on("keypress", "#command-input", function(e) {
    if (e.which == 13) {
        var cmd = $("#command-input").val();
        ui.loading(true);
        blackbird.player.execute(cmd, function(data) {
            if ((data == "nf") || (data.length != 2)) {
                ui.flash();
            }
            else {
                if (data[0] == "m") {
                    ui.setMode(blackbird.player, data[1]);
                    blackbird.player.genCoords(function() {
                        ui.plotScatter(blackbird.player, -1, false);
                    });
                }
                else if (data[0] == "r") {
                    ui.setRepeat(data[1]);
                }
                else if (data[0] == "s") {
                    ui.setSleep(data[1]);
                }
            }
            ui.loading(false);
        });
    }
});
