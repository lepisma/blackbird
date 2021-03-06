// Main script
// -----------

var blackbird = blackbird || {};

window.$ = window.jQuery = require("jquery");
const yamljs = require("yamljs");
const os = require("os");
const path = require("path");
const ui = require("./app/js/ui");

// Config path, change this to automatic
const CONFIG_PATH = path.join(os.homedir(), ".blackbird", "config.yaml");

blackbird.config = yamljs.load(CONFIG_PATH);
blackbird.Player = require("./app/js/player");
blackbird.electron = require("electron");
blackbird.ipc = blackbird.electron.ipcRenderer;
blackbird.mainWindow = blackbird.electron.remote.getCurrentWindow();

blackbird.player = new blackbird.Player(blackbird.config, function() {
    ui.initScatter(blackbird.player);
    // First play
    blackbird.player.next();
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
    if (e.keyCode == 88 && e.altKey) {
        $("#command-input").select();
    }
});

// Close metadata div
$(document).keydown(function(e) {
    if (e.keyCode == 27) {
        $("#metadata-wrap").fadeOut();
    }
});

// Initiate download
$(document).on("keypress", "#metadata input", function(e) {
    if (e.which == 13) {
        // Download using data from input boxes
        metadata = ui.metadataReturn();
        var url = blackbird.youtubeWindow.getURL();
        blackbird.player.downloader.download(url, metadata);
    }
});

// Close
$(document).keydown(function(e) {
    if (e.keyCode == 87 && e.ctrlKey) {
        blackbird.mainWindow.close();
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
                    blackbird.player.updateCoords(function() {
                        ui.updateScatter(blackbird.player.coords);
                    });
                }
                else if (data[0] == "l") {
                    ui.flash("ok");
                }
                else if (data[0] == "r") {
                    ui.setIndicator("repeat", data[1]);
                }
                else if (data[0] == "s") {
                    ui.setIndicator("sleep", data[1]);
                }
                else if (data[0] == "d") {
                    if (blackbird.youtubeWindow == null) {
                        // Open youtube frame
                        blackbird.youtubeWindow = new blackbird.electron.remote.BrowserWindow({
                            width: 500,
                            height: 600
                        });
                        blackbird.youtubeWindow.setMenu(null);
                        blackbird.youtubeWindow.loadURL("https://youtube.com");
                        blackbird.youtubeWindow.on("closed", function() {
                            blackbird.youtubeWindow = null;
                            $("#metadata-wrap").fadeOut();
                        });
                    }
                    else {
                        // Fill and confirm input boxes
                        var metadata = blackbird.player.downloader.parseMetadata(blackbird.youtubeWindow.getTitle());
                        ui.metadataShow(metadata);
                    }
                }
            }
            ui.loading(false);
        });
    }
});
