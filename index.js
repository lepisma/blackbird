// Electron entry point

"use strict";

const electron = require("electron");
const app = electron.app;
const shortcuts = electron.globalShortcut;
const BrowserWindow = electron.BrowserWindow;
const Tray = electron.Tray;
const Menu = electron.Menu;
const ipcMain = electron.ipcMain;

var mainWindow = null;
var appIcon = null;
var closeTimer = false;

app.on("ready", function() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 460,
        minWidth: 780,
        minHeight: 440,
        frame: true,
        resizable: true,
        icon: __dirname + "/icons/icon32.png"
    });

    mainWindow.setMenu(null);
    // Tray icon
    appIcon = new Tray(__dirname + "/icons/icon32.png");
    appIcon.setToolTip("blackbird");
    var trayMenu = Menu.buildFromTemplate([
        {
            label: "Show/Hide",
            click: function() {
                toggleVisibility();
            }
        },
        {
            label: "Exit",
            click: function() {
                app.quit();
            }
        }
    ]);
    appIcon.setContextMenu(trayMenu);
    appIcon.on("clicked", function() {
        toggleVisibility();
    });

    // and load the index.html of the app.
    mainWindow.loadURL("file://" + __dirname + "/index.html");

    // Open the devtools.
    mainWindow.openDevTools();

    var toggleVisibility = function() {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        }
        else {
            mainWindow.show();
        }
    };

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
        if (closeTimer == true) {
            app.quit();
        }
        else {
            mainWindow.hide();
            closeTimer = true;
            setTimeout(function() {
                closeTimer = false;
            }, 1000);
        }
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
