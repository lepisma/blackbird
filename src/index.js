// Electron entry point

const electron = require("electron");
const app = electron.app;
const shortcuts = electron.globalShortcut;
const BrowserWindow = electron.BrowserWindow;
const Tray = electron.Tray;
const Menu = electron.Menu;
const path = require("path");

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

    mainWindow.setMenu(null);
    // Tray icon
    appIcon = new Tray(path.join(__dirname, "/icons/icon16.png"));
    appIcon.setToolTip("blackbird");
    var trayMenu = Menu.buildFromTemplate([
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
    mainWindow.loadURL(path.join(__dirname, "index.html"));

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
