// Main script
// -----------

var blackbird = blackbird || {};

window.$ = window.jQuery = require("jquery");
window.d3 = require("d3");
const ui = require("./app/js/ui");
const utils = require("./app/js/utils");
require("jquery-ui");
const restify = require("restify");
const path = require("path");

blackbird.config = require("./app/js/config");
blackbird.Player = require("./app/js/player");
blackbird.electron = require("electron");
blackbird.ipc = blackbird.electron.ipcRenderer;
blackbird.api = restify.createServer();
blackbird.mainWindow = blackbird.electron.remote.getCurrentWindow();

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

// Title bar buttons
$("#minimize-btn").click(function() {
    blackbird.mainWindow.minimize();
});

$("#maximize-btn").click(function() {
    if (blackbird.mainWindow.isMaximized()) {
        blackbird.mainWindow.unmaximize();
    }
    else {
        blackbird.mainWindow.maximize();
    }
});

$("#close-btn").click(function() {
    blackbird.mainWindow.close();
});

// Settings
$("#settings-btn").click(function() {
    //
});

// Youtube window
$("#youtube-btn").click(function() {
    if (blackbird.youtubeWindow) {
        // Window already open, bring to focus
        blackbird.youtubeWindow.show();
    }
    else {
        // Open youtube
        blackbird.youtubeWindow = new blackbird.electron.remote.BrowserWindow({
            width: 500,
            height: 600
        });
        blackbird.youtubeWindow.setMenu(null);
        blackbird.youtubeWindow.loadURL("https://youtube.com");
        blackbird.youtubeWindow.on("closed", function() {
            blackbird.youtubeWindow = null;
            $("#metadata").hide();
        });
    }
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
                ui.flash("error");
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
                else if (data[0] == "d") {
                    // flag error if youtubeWindow not opened
                    if ((blackbird.youtubeWindow == null) || (data[1] == "error")) {
                        ui.flash("error");
                    }
                    else {
                        // Do something for download
                        if (data[1] == "confirm") {
                            // Fill and confirm input boxes
                            var metadata = utils.parseMetadata(blackbird.youtubeWindow.getTitle());
                            ui.metadataShow(metadata);
                        }
                        else if (data[1] == "ok") {
                            // Download using data from input boxes
                            metadata = ui.metadataReturn();
                            var url = blackbird.youtubeWindow.getURL();
                            blackbird.player.client.invoke("save", url, metadata, function(err, res, more) {
                                console.log(err);
                            });
                            ui.flash("ok");
                        }
                    }
                }
            }
            ui.loading(false);
        });
    }
});
