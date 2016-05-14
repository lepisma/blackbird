#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

fs.stat(path.join(os.homedir(), ".blackbird", "config.yaml"), function(err, stat) {
    if (err == null) {
        // Configuration found, running application
        const electron = require("electron-prebuilt");
        const proc = require("child_process");
        proc.spawn(electron, [path.join(__dirname, "..")], {stdio: "inherit"});
    }
    else {
        console.log("Configuration file not found");
        console.log("Please run `blackbird-setup`");
    }
});
