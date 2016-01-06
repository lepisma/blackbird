// Electron entry point

var app = require("app");
var BrowserWindow = require("browser-window");
var shortcuts = require("global-shortcut");
var path = require("path");
var tray = require("tray");
var menu = require("menu");

require("crash-reporter").start();

var mainWindow = null;
var appIcon = null;

app.on("ready", function() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 560,
        frame: false,
        resizable: true,
        icon: path.join(__dirname, "/icons/icon32.png")
    });

    // Tray icon
    appIcon = new tray(path.join(__dirname, "/icons/icon16.png"));
    appIcon.setToolTip("blackbird");
    var trayMenu = menu.buildFromTemplate([
        {
            label: "Exit",
            click: function() {
                app.quit();
            }
        }
    ]);
    appIcon.setContextMenu(trayMenu);
    appIcon.on("clicked", function() {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        }
        else {
            mainWindow.show();
        }
    });

    // and load the index.html of the app.
    mainWindow.loadUrl(path.join(__dirname, "index.html"));

    // Open the devtools.
    mainWindow.openDevTools();

    // Registed keyboard shortcuts
    var register_play = shortcuts.register("ctrl+alt+space", function() {
        mainWindow.webContents.send("ping", "play-pause");
    });

    var register_prev = shortcuts.register("ctrl+alt+left", function() {
        mainWindow.webContents.send("ping", "prev");
    });

    var register_next = shortcuts.register("ctrl+alt+right", function() {
        mainWindow.webContents.send("ping", "next");
    });

    var register_hide = shortcuts.register("ctrl+alt+down", function() {
        mainWindow.hide();
    });

    var register_show = shortcuts.register("ctrl+alt+up", function() {
        mainWindow.show();
    });

    // Hide on minimize
    mainWindow.on("minimize", function() {
        mainWindow.hide();
    });

    // Emitted when the window is closed.
    mainWindow.on("closed", function() {
        mainWindow = null;
    });
});
