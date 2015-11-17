// Electron entry point

var app = require("app");
var BrowserWindow = require("browser-window");
var shortcuts = require("global-shortcut");
var path = require("path");

require("crash-reporter").start();

var mainWindow = null;

app.on("ready", function() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 560,
        frame: false,
        resizable: true,
        icon: path.join(__dirname, "/icons/icon32.png")
    });

    // and load the index.html of the app.
    mainWindow.loadUrl(path.join(__dirname, "index.html"));

    // Open the devtools.
    mainWindow.openDevTools();

    // Registed keyboard shortcuts
    var register_play = shortcuts.register("ctrl+alt+space", function(){
        mainWindow.webContents.send("ping", "play-pause");
    });

    var register_prev = shortcuts.register("ctrl+alt+left", function(){
        mainWindow.webContents.send("ping", "prev");
    });

    var register_next = shortcuts.register("ctrl+alt+right", function(){
        mainWindow.webContents.send("ping", "next");
    });

    // Windows thumbar
    // mainWindow.setThumbarButtons([
    //     {
    //         tooltip: "prev",
    //         icon: path.join(__dirname, "/icons/iconPrev.png"),
    //         click: function() {
    //             mainWindow.webContents.send("ping", "prev");
    //         }
    //     },
    //     {
    //         tooltip: "play/pause",
    //         icon: path.join(__dirname, "/icons/iconPlay.png"),
    //         click: function() {
    //             mainWindow.webContents.send("ping", "play-pause");
    //         }
    //     },
    //     {
    //         tooltip: "next",
    //         icon: path.join(__dirname, "/icons/iconNext.png"),
    //         click: function() {
    //             mainWindow.webContents.send("ping", "next");
    //         }

    //     }
    // ]);

    // Emitted when the window is closed.
    mainWindow.on("closed", function() {
        mainWindow = null;
    });
});
