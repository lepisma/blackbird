// Main player
// -----------

// imports
const fs = require("fs"),
      mm = require("musicmetadata"),
      sqlite = require("sqlite3"),
      utils = require("./utils"),
      ui = require("./ui"),
      extras = require("./extras"),
      filters = require("./filters");

// Player
var Player = function(config, callback) {
    var that = this;

    // Setup DB
    that.beetsDb = new sqlite.Database(config.beets_db);
    that.blackbirdDb = new sqlite.Database(config.blackbird_db);

    // Initialize lastfm scrobbler
    that.scrobbler = new extras.Scrobbler(config.lastfm);

    // Connect to downloader
    that.downloader = new extras.RpcDownloadClient(config.rpc_port);

    // Initialize api
    that.api = new extras.API(that, config.api_port);

    // Initialize sequences
    that.beetsDb.all("SELECT id FROM items", function(err, rows) {
        // Generate state/mode etc.
        that.repeat = false;
        that.sleep = null;
        that.scrobbled = false;
        that.savedState = {
            saved: false,
            value: 0
        };
        that.currentData = null;
        that.currentIndex = 0;
        that.randomSeq = [];
        that.searchSeq = [];
        that.artistSeq = [];
        that.albumSeq = [];

        rows.forEach(function(row) {
            that.randomSeq.push(row.id);
        });

        that.randomSeq = utils.shuffle(that.randomSeq);

        that.sequence = that.randomSeq;
        that.seqCount = that.sequence.length;

        that.audioElem = document.createElement("audio");

        // Create seekbar
        ui.createSeekbar(function(val) {
            that.audioElem.currentTime = val * that.audioElem.duration / 100.0;
        });

        // Bind seekbar update
        $(that.audioElem).bind("timeupdate", function() {
            that.played();
            ui.updateSeek((that.audioElem.currentTime / that.audioElem.duration) * 100);
        });

        // Bind song ended event
        $(that.audioElem).bind("ended", function() {
            that.next();
        });

        // Initialize visualizer
        ui.initVisualizer(that.audioElem);

        // Gather coordinates
        that.blackbirdDb.all("SELECT id, x, y FROM coords", function(err, rows) {
            that.coords = {};
            rows.forEach(function(row) {
                that.coords[row.id] = {
                    x: row.x,
                    y: row.y
                };
            });
            that.updateCoords(callback);
        });
    });
};

Player.prototype.updateCoords = function(callback) {
    // Update coords with new shading value from current sequence
    for (var key in this.coords) {
        this.coords[key].shade = this.sequence.indexOf(parseInt(key)) > -1;
    }
    callback();
};

// Play given song
Player.prototype.play = function() {
    var that = this;
    that.getData(that.sequence[that.currentIndex], function(data) {
        // Update UI
        that.currentData = data;
        ui.updateSeek(0);
        ui.updatePlayPause(true);
        ui.plotTrackChange(that.sequence[that.currentIndex]);

        that.scrobbled = false;
        that.audioElem.src = that.currentData.path;
        that.audioElem.play();

        // Get cover art
        mm(fs.createReadStream(that.currentData.path), function(err, metadata) {
            var base64String = "";
            var dataUrl = "";
            try {
                for (var i = 0; i < metadata.picture[0].data.length; i++) {
                    base64String += String.fromCharCode(metadata.picture[0].data[i]);
                }
                dataUrl = "data:" + metadata.picture[0].format + ";base64," + window.btoa(base64String);
            }
            catch (exp) {
                // Falling back to default image
                dataUrl = "./icons/cover.png";
            }
            finally {
                that.currentData.cover = dataUrl;
                ui.updateInfo(that.currentData);
            }
        });
    });
};

// Single click and play
Player.prototype.singlePlay = function(songIdx) {
    var sequencePos = this.sequence.indexOf(songIdx);
    this.currentIndex = sequencePos;
    this.play();
};

// Play next
Player.prototype.next = function() {
    // Check if sleep is done
    if (this.sleep < 0) {
        return;
    }

    // Check repeat
    if ((!this.repeat) || (this.currentData == null)) {
        this.currentIndex += 1;
        this.currentIndex %= this.seqCount;
    }
    this.play();
};

// Play previous
Player.prototype.previous = function() {
    // Check repeat
    if ((!this.repeat) || (this.currentData == null)) {
        this.currentIndex -= 1;
        if (this.currentIndex < 0) {
            this.currentIndex += this.seqCount;
        };
    }
    this.play();
};

// Pause/play
Player.prototype.pause = function(callback) {
    if (this.audioElem.paused) {
        this.audioElem.play();
        callback(true);
    }
    else {
        this.audioElem.pause();
        callback(false);
    }
};

// Mark the song as played
Player.prototype.played = function() {
    duration = this.audioElem.duration;
    currentTime = this.audioElem.currentTime;

    if ((this.scrobbled == false) && (duration > 30)) {

        var halfTime = duration / 2;
        var capTime = 4 * 60;

        if (currentTime > (Math.min(capTime, halfTime))) {
            // Scrobble current track
            if (this.scrobbler.active) {
                this.scrobbler.scrobble(this.currentData);
            }
            this.scrobbled = true;
            if (this.sleep != null) {
                this.sleep -= 1;
            }
        }
    }
};

// Set data for given id
Player.prototype.getData = function(songId, callback) {
    // Return data from song id
    this.beetsDb.get("SELECT title, artist, album, cast(path as TEXT) as path FROM items WHERE id = ?", songId, function(err, row) {
        callback(row);
    });
};

// Execute the given command
Player.prototype.execute = function(cmd, callback) {
    var that = this;

    var command = cmd.split(" "),
        action = command[0],
        args;

    if (command.length > 1) {
        command.shift();
        args = command.join(" ");
    }

    // Handle love
    if (["love", "l"].indexOf(action) > -1) {
        if (that.scrobbler.active) {
            that.scrobbler.love(that.currentData, function(res) {
                callback(["l", "love"]);
            });
        }
        else {
            callback("nf");
        }
    }
    // Handle download
    else if (["download", "d"].indexOf(action) > -1) {
        if (args == "y") {
            callback(["d", "ok"]);
        }
        else if (args == undefined) {
            callback(["d", "confirm"]);
        }
        else {
            callback(["d", "error"]);
        }
    }
    // Handle repeat
    else if (["repeat", "r"].indexOf(action) > -1) {
        that.repeat = !that.repeat;
        callback(["r", that.repeat]);
    }
    // Handle artist
    else if (["artist", "a"].indexOf(action) > -1) {
        if (that.savedState.saved == false) {
            that.savedState.value = that.currentIndex;
            that.savedState.saved = true;
        }

        that.artistSeq = [];
        that.beetsDb.all("SELECT id FROM items WHERE artist = ?", that.currentData.artist, function(err, rows) {
            rows.forEach(function(row) {
                that.artistSeq.push(row.id);
            });
            that.seqCount = that.artistSeq.length;
            that.artistSeq = utils.shuffle(that.artistSeq);
            that.sequence = that.artistSeq;
            that.currentIndex = 0;

            callback(["m", "artist"]);
        });
    }
    // Handle album
    else if (["album", "am"].indexOf(action) > -1) {
        if (that.savedState.saved == false) {
            that.savedState.value = that.currentIndex;
            that.savedState.saved = true;
        }

        that.albumSeq = [];
        that.beetsDb.all("SELECT id FROM items WHERE album = ?", that.currentData.album, function(err, rows) {
            rows.forEach(function(row) {
                that.albumSeq.push(row.id);
            });
            that.seqCount = that.albumSeq.length;
            that.albumSeq = utils.shuffle(that.albumSeq);
            that.sequence = that.albumSeq;
            that.currentIndex = 0;

            callback(["m", "album"]);
        });
    }
    // Handle search
    else if (["search", "s"].indexOf(action) > -1) {
        if (that.savedState.saved == false) {
            that.savedState.value = that.currentIndex;
            that.savedState.saved = true;
        }

        that.searchSeq = [];
        that.beetsDb.all("SELECT id FROM items WHERE (artist || ' ' || title || ' ' || album) like '%' || ? || '%'", args, function(err, rows) {
            rows.forEach(function(row) {
                that.searchSeq.push(row.id);
            });
            if (that.searchSeq.length == 0) {
                callback("nf");
            }
            else {
                that.seqCount = that.searchSeq.length;
                that.searchSeq = utils.shuffle(that.searchSeq);
                that.sequence = that.searchSeq;
                that.currentIndex = 0;

                callback(["m", "search"]);
            }

        });
    }
    // Handle similar
    else if (["similar", "sim"].indexOf(action) > -1) {
        if (that.savedState.saved == false) {
            that.savedState.value = that.currentIndex;
            that.savedState.saved = true;
        }

        var distances = [];
        var anchorPoint = that.coords[that.sequence[that.currentIndex]],
            currentPoint;

        for (var i = 0; i < that.sequence.length; i++) {
            currentPoint = that.coords[that.sequence[i]];
            distances.push(Math.abs(anchorPoint.x - currentPoint.x) +
                           Math.abs(anchorPoint.y - currentPoint.y));
        }

        var similarIndices = utils.argsort(distances);
        var similarSeq = [];

        for (i = 0; i < similarIndices.length; i ++) {
            similarSeq.push(that.sequence[similarIndices[i]]);
        }
        that.sequence = similarSeq;
        that.currentIndex = 0;

        callback(["m", "similar"]);
    }
    // Handle free
    else if (["free", "f"].indexOf(action) > -1) {
        that.sequence = that.randomSeq;
        that.seqCount = that.sequence.length;
        that.currentIndex = that.savedState.value;
        that.savedState.saved = false;
        callback(["m", "free"]);
    }
    // Handle sleep
    else if (["sleep", "slp"].indexOf(action) > -1) {
        // Set sleep
        if (isNaN(args)) {
            callback("nf");
        }
        else {
            if (parseInt(args) < 0) {
                that.sleep = null;
                callback(["s", false]);
            }
            else {
                that.sleep = parseInt(args);
                callback(["s", true]);
            }
        }
    }
    else {
        callback("nf");
    }
};

module.exports = Player;
