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

        // Bind seekbar update
        $(that.audioElem).bind("timeupdate", function() {
            that.played();
            ui.updateSeek((that.audioElem.currentTime / that.audioElem.duration) * 100);
        });

        // Bind song ended event
        $(that.audioElem).bind("ended", function() {
            that.next();
        });

        callback();
    });
};

// Play given song
Player.prototype.play = function() {
    var that = this;

    that.getData(that.sequence[that.currentIndex], function(data) {
        // Update UI
        that.currentData = data;
        ui.updateSeek(0);
        ui.updatePlayPause(true);
        that.genCoords(function() {
            ui.plotScatter(that, that.sequence[that.currentIndex], true);
        });

        that.scrobbled = false;

        that.audioElem.src = that.currentData.path;
        that.audioElem.play();

        // Update cover art
        var parser = mm(fs.createReadStream(that.currentData.path), function(err, metadata) {
            if (err) {
                throw err;
            }

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
                ui.updateInfo(that.currentData.title, that.currentData.artist, dataUrl);
            }
        });
    });
};

// Single click and play
// Disturbs the main sequence, replaces the current element
Player.prototype.singlePlay = function(songIdx) {
    var that = this;
    that.sequence[that.currentIndex] = songIdx;
    that.play();
};

// Play next
Player.prototype.next = function() {
    var that = this;

    // Check if sleep is done
    if (that.sleep < 0) {
        return;
    }

    // Check repeat
    if ((!that.repeat) || (that.currentData == null)) {
        that.currentIndex += 1;
        that.currentIndex %= that.seqCount;
    }
    that.play();
};

// Play previous
Player.prototype.previous = function() {
    var that = this;

    // Check repeat
    if ((!that.repeat) || (that.currentData == null)) {
        that.currentIndex -= 1;
        if (that.currentIndex < 0) {
            that.currentIndex += that.seqCount;
        };
    }
    that.play();
};

// Seek to given position
Player.prototype.seek = function(position) {
    this.audioElem.currentTime = position * this.audioElem.duration / 100.0;
};

// Pause/play
Player.prototype.pause = function(callback) {
    var that = this;
    if (that.audioElem.paused) {
        that.audioElem.play();
        callback(true);
    }
    else {
        that.audioElem.pause();
        callback(false);
    }
};

// Mark the song as played
Player.prototype.played = function() {
    var that = this;

    duration = that.audioElem.duration;
    currentTime = that.audioElem.currentTime;

    if ((that.scrobbled == false) && (duration > 30)) {

        var halfTime = duration / 2;
        var capTime = 4 * 60;

        if (currentTime > (Math.min(capTime, halfTime))) {
            // Scrobble current track
            if (that.scrobbler.active) {
                that.scrobbler.scrobble(that.currentData);
            }
            that.scrobbled = true;
            if (that.sleep != null) {
                that.sleep -= 1;
            }
        }
    }
};

// Set data for given id
Player.prototype.getData = function(songId, callback) {
    // Return data from global song id
    var that = this;
    that.beetsDb.get("SELECT title, artist, album, cast(path as TEXT) as path FROM items WHERE id = ?", songId, function(err, row) {
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

// Get coordinates for plotting
Player.prototype.genCoords = function(callback) {
    var that = this;

    that.blackbirdDb.all("SELECT id, x, y FROM coords", function(err, rows) {
        that.coords = {};
        rows.forEach(function(row) {
            that.coords[row.id] = {
                x: row.x,
                y: row.y,
                shade: (that.sequence.indexOf(row.id) > -1)
            };
        });
        callback();
    });
};

module.exports = Player;
