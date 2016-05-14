#!/usr/bin/env node

const yargs = require("yargs");
const yamljs = require("yamljs");
const fs = require("fs-extra");
const prompt = require("prompt");
const colors = require("colors/safe");
const path = require("path");
const os = require("os");

// player data home
const DATA_PATH = path.join(os.homedir(), ".blackbird");
const CONFIG_PATH = path.join(DATA_PATH, "config.yaml");
fs.ensureDirSync(DATA_PATH);

yargs.usage("$0 <cmd> [args]")
    .command("init", "Fresh setup", {}, function(argv) {
        configure(function() {
            reset();
            beets();
        });
    })
    .command("reset", "Reset blackbird stores", {}, function(argv) {
        reset();
    })
    .command("configure", "(Re)touch configuration file", {}, function(argv) {
        configure();
    })
    .command("beets", "Add beets integration", {}, function(argv) {
        beets();
    })
    .help("help")
    .argv;

function configure(callback) {
    // Check for configuration file
    // Use older values as defaults while asking user inputs

    fs.stat(CONFIG_PATH, function(err, stat) {
        if (err == null) {
            // File found
            updateConfig(yamljs.load(CONFIG_PATH), callback);
        }
        else {
            // File not found, using few presets as default
            var config = {
                beets: {
                    config: "",
                    db: ""
                },
                data: {
                    db: path.join(DATA_PATH, "blackbird.db"),
                    features: path.join(DATA_PATH, "features.pickle"),
                    model: {
                        arch: path.join(DATA_PATH, "model", "arch.yaml"),
                        weights: path.join(DATA_PATH, "model", "weights.hd5"),
                        output: 3
                    },
                    plugin: path.join(DATA_PATH, "beetsplug")
                },
                lastfm: {
                    user: "",
                    password: "",
                    api: "",
                    secret: ""
                },
                api: {
                    port: 1234
                },
                download: {
                    directory: ""
                }
            };
            updateConfig(config, callback);
        }
    });
}

function updateConfig(config, callback) {

    prompt.message = colors.cyan(">");
    prompt.delimiter = colors.green("::");
    prompt.start();

    var promptItems = [
        {
            name: "beetsConfig",
            description: colors.blue("Path of beets config.yaml file"),
            required: true,
            type: "string",
            conform: function(value) {
                try {
                    fs.statSync(value);
                    return true;
                }
                catch (err) {
                    return false;
                }
            },
            message: "Invalid path",
            default: config.beets.config
        },
        {
            name: "lfmEnable",
            description: colors.blue("Do you wish to enable last.fm integration ?"),
            required: true,
            type: "string",
            conform: function(value) {
                if (["y", "yes", "n", "no"].indexOf(value) > -1) {
                    return true;
                }
                else {
                    return false;
                }
            },
            message: "Respond in either y (yes) or n (no)",
            before: function(value) {
                return value[0];
            },
            default: "n"
        },
        {
            name: "lfmUser",
            description: colors.blue("Enter lastfm username"),
            required: true,
            ask: function() {
                return prompt.history("lfmEnable").value == "y";
            },
            default: config.lastfm.user
        },
        {
            name: "lfmPass",
            description: colors.blue("Enter lastfm password"),
            hidden: true,
            required: true,
            replace: "*",
            ask: function() {
                return prompt.history("lfmEnable").value == "y";
            },
            default: config.lastfm.password
        },
        {
            name: "lfmApi",
            description: colors.blue("Enter lastfm api key"),
            required: true,
            ask: function() {
                return prompt.history("lfmEnable").value == "y";
            },
            default: config.lastfm.api
        },
        {
            name: "lfmSecret",
            description: colors.blue("Enter lastfm api secret"),
            required: true,
            ask: function() {
                return prompt.history("lfmEnable").value == "y";
            },
            default: config.lastfm.secret
        },
        {
            name: "apiPort",
            description: colors.blue("Enter port for player api"),
            required: true,
            conform: function(value) {
                if (parseInt(value)) {
                    return true;
                }
                else {
                    return false;
                }
            },
            message: "Enter a number",
            before: function(value) {
                return parseInt(value);
            },
            default: config.api.port
        },
        {
            name: "downloadDir",
            description: colors.blue("Enter directory for youtube downloads"),
            required: true,
            type: "string",
            conform: function(value) {
                try {
                    fs.statSync(value);
                    return true;
                }
                catch (err) {
                    return false;
                }
            },
            message: "Invalid path",
            default: config.download.directory
        }
    ];

    prompt.get(promptItems, function(err, result) {
        // Update config object
        config.beets.config = result.beetsConfig;

        if (result.lfmEnable == "n") {
            config.lastfm = {
                user: "",
                password: "",
                api: "",
                secret: "",
            };
        }
        else {
            config.lastfm = {
                user: result.lfmUser,
                password: result.lfmPass,
                api: result.lfmApi,
                secret: result.lfmSecret
            };
        }
        config.api.port = result.apiPort;
        config.download.directory = result.downloadDir;

        // Check for beets db
        var beetsConfig = yamljs.load(config.beets.config);
        if (beetsConfig.library) {
            // Reading beets db path from beets config
            config.beets.db = beetsConfig.library;
        }
        else {
            // Assume the library is in the same path as config
            config.beets.db = path.join(path.dirname(config.beets.config), "library.db");
        }

        fs.writeFile(CONFIG_PATH, yamljs.stringify(config), function(err) {
            if (err) {
                throw err;
            }
            console.log("\nConfiguration saved !");
            callback();
        });
    });
}

function reset() {
    // Copy over the stubs to set paths after creating backups
    var config = yamljs.load(CONFIG_PATH);

    // Copy empty db
    var bbDb = config.data.db;
    fs.stat(bbDb, function(err, stat) {
        if (err == null) {
            // file exists, take backup
            console.log("database exists, taking backup");
            fs.copySync(bbDb, bbDb + ".backup");
        }
        fs.copySync(path.join(__dirname, "..", "utils", "init", "blackbird.db"),
                    bbDb);
    });

    // Copy empty features pickle
    var featuresFile = config.data.features;
    fs.stat(featuresFile, function(err, stat) {
        if (err == null) {
            // file exists, take backup
            console.log("features file exists, taking backup");
            fs.copySync(featuresFile, featuresFile + ".backup");
        }
        fs.copySync(path.join(__dirname, "..", "utils", "init", "features.pickle"), featuresFile);
    });

    // Copy model data
    fs.ensureDirSync(path.join(DATA_PATH, "model"));
    fs.copySync(path.join(__dirname, "..", "utils", "network", "model", "arch.yaml"), config.data.model.arch);

    fs.copySync(path.join(__dirname, "..", "utils", "network", "model", "weights.hd5"), config.data.model.weights);

    // Copy beets plugin
    fs.copySync(path.join(__dirname, "..", "utils", "beetsplug"), config.data.plugin);
}

function beets() {
    var config = yamljs.load(CONFIG_PATH);
    var beetsConfig = yamljs.load(config.beets.config);

    // Add pluginpath entry
    if (beetsConfig.pluginpath.indexOf(config.data.plugin) == -1) {
        beetsConfig.pluginpath.push(config.data.plugin);
    }

    // Add plugin entry
    if (beetsConfig.plugins.indexOf("blackbird") == -1) {
        beetsConfig.plugins += "blackbird";
    }

    // Add blackbird entry
    beetsConfig.blackbird = {
        db: config.data.db,
        features: config.data.features,
        model: {
            arch: config.data.model.arch,
            weights: config.data.model.weights,
            output: config.data.model.output
        }
    }

    fs.writeFile(config.beets.config, yamljs.stringify(beetsConfig), function(err) {
        if (err) {
            throw err;
        }
        console.log("beets integration done !");
    });
}
