// Main player
// -----------

var blackbird = blackbird || {};

// Things for cover art
blackbird.fs = require("fs");
blackbird.mm = require("musicmetadata");
blackbird.lastfm = require("simple-lastfm");
blackbird.sqlite = require("sqlite3");

// Utility functions
var shuffle = function(array) {
    // Shuffle array
    var idx = array.length,
        temporaryValue,
        randomIdx ;

    while (0 !== idx) {
        // Pick a remaining element...
        randomIdx = Math.floor(Math.random() * idx);
        idx -= 1;
        temporaryValue = array[idx];
        array[idx] = array[randomIdx];
        array[randomIdx] = temporaryValue;
    }
    return array;
};

blackbird.Player = function(dbName, callback) {
    var that = this;
    that.db = new blackbird.sqlite.Database(dbName);

    // Load data from base
    // that.feature = feats
    // that.coordinates = 2d feats
    // Handle without feature songs too

    that.db.get("SELECT count(*) as c FROM SONGS", function(err, row) {
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
        that.similarSeq = [];

        that.totalCount = row.c;
        for (var i = 0; i < that.totalCount; i++) {
            that.randomSeq.push(i);
        }

        that.randomSeq = shuffle(that.randomSeq);

        that.sequence = that.randomSeq;
        that.seqCount = that.sequence.length;

        that.audioElem = document.createElement("audio");

        // Bind seekbar update
        $(that.audioElem).bind("timeupdate", function() {
            that.played();
            blackbird.updateSeek((that.audioElem.currentTime / that.audioElem.duration) * 100);
        });

        // Bind song ended event
        $(that.audioElem).bind("ended", function() {
            that.next();
        });

        callback();
    });
};

// Play given song
blackbird.Player.prototype.play = function() {
    var that = this;

    that.getData(that.sequence[that.currentIndex] + 1, function() {
        // Update UI
        blackbird.updateSeek(0);
        blackbird.updatePlayPause(true);
        that.genCoords(function() {
            blackbird.plotScatter(that.sequence[that.currentIndex], true);
        });
        // TODO: last fm now playing
        that.scrobbled = false;

        that.audioElem.src = that.currentData.path;
        that.audioElem.play();

        // Update cover art
        var parser = blackbird.mm(blackbird.fs.createReadStream(that.currentData.path), function(err, metadata) {
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
                blackbird.updateInfo(that.currentData.title, that.currentData.artist, dataUrl);
            }

        });
    });
};

// Play next
blackbird.Player.prototype.next = function() {

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
blackbird.Player.prototype.previous = function() {

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
blackbird.Player.prototype.seek = function(position) {
    this.audioElem.currentTime = position * this.audioElem.duration / 100.0;
};

// Pause/play
blackbird.Player.prototype.pause = function(callback) {

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
blackbird.Player.prototype.played = function() {
    var that = this;

    duration = that.audioElem.duration;
    currentTime = that.audioElem.currentTime;

    if ((that.scrobbled == false) && (duration > 30)) {

        var halfTime = duration / 2;
        var capTime = 4 * 60;

        if (currentTime > (Math.min(capTime, halfTime))) {
            // Scrobble current track
            that.scrobbled = true;
            if (that.sleep != null) {
                that.sleep -= 1;
            }
        }
    }
};

blackbird.Player.prototype.getData = function(songId, callback) {
    // Return data from global song id
    var that = this;
    that.db.get("SELECT title, artist, album, path from SONGS WHERE id = ?", songId, function(err, row) {
        that.currentData = row;
        callback();
    });
};

// Execute the given command
blackbird.Player.prototype.execute = function(cmd, callback) {
    var that = this;

    var command = cmd.split(" "),
        action = command[0],
        args;

    if (command.length > 1) {
        command.shift();
        args = command.join(" ");
    }

    // Handle repeat
    if (["repeat", "r"].indexOf(action) > -1) {
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
        that.db.all("SELECT id from SONGS WHERE artist = ?", that.currentData.artist, function(err, rows) {
            rows.forEach(function(row) {
                that.artistSeq.push(row.id - 1);
            });
            that.seqCount = that.artistSeq.length;
            that.artistSeq = shuffle(that.artistSeq);
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
        that.db.all("SELECT id from SONGS WHERE album = ?", that.currentData.album, function(err, rows) {
            rows.forEach(function(row) {
                that.albumSeq.push(row.id - 1);
            });
            that.seqCount = that.albumSeq.length;
            that.albumSeq = shuffle(that.albumSeq);
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
        that.db.all("SELECT id, artist, album, title FROM SONGS", function(err, rows) {
            rows.forEach(function(row) {
                var text = row.artist + row.album + row.title;
                if (text.toLowerCase().indexOf(args) > -1) {
                    that.searchSeq.push(row.id - 1);
                }
            });
            if (that.searchSeq.length == 0) {
                callback("nf");
            }
            else {
                that.seqCount = that.searchSeq.length;
                that.searchSeq = shuffle(that.searchSeq);
                that.sequence = that.searchSeq;
                that.currentIndex = 0;

                callback(["m", "search"]);
            }

        });
    }
    // Handle similar
    else if (["similar", "sim"].indexOf(action) > -1) {
        callback("nf");
        // if (that.savedState.saved == false) {
        //     that.savedState.value = that.currentIndex;
        //     that.savedState.saved = true;
        // }

        // callback(["m", "similar"]);
    }
    // Handle free
    else if (["free", "f"].indexOf(action) > -1) {
        that.sequence = that.randomSeq;
        that.seqCount = that.sequence.length;
        that.currentIndex = that.savedState.value;
        that.savedState.saved = false;
        callback(["m", "free"]);
    }
    // Handle love
    else if (["love", "l"].indexOf(action) > -1) {
        // Love track
        if (that.currentData != null) {
            // Last fm request here
            callback("nf");
        }
        else {
            callback("nf");
        }
    }
    // Handle sleep
    else if (["sleep", "slp"].indexOf(action) > -1) {
        // Set sleep
        if (isNaN(args)) {
            callback("nf");
            console.log("dfdf");
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
blackbird.Player.prototype.genCoords = function(callback) {
    var that = this;

    that.db.all("SELECT id, x, y FROM COORDS", function(err, rows) {
        blackbird.coords = [];
        rows.forEach(function(row) {
            var shade = false;
            if (blackbird.player.sequence.indexOf(row.id) > -1) {
                shade = true;
            }
            blackbird.coords.push([shade, row.x, row.y]);
        });
        callback();
    });
};
