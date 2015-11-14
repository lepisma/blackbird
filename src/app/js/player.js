// Main player
// -----------

var blackbird = blackbird || {};

// Things for cover art
blackbird.fs = require("fs");
blackbird.mm = require("musicmetadata");

blackbird.Player = function(root) {
    var that = this;
    that.root = root;
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
};

// Scrobble flag
blackbird.Player.prototype.scrobbled = false;

// Play given song
blackbird.Player.prototype.play = function(data) {
    // Update UI
    blackbird.updateSeek(0);
    blackbird.updatePlayPause(true);
    blackbird.updateInfo(data["title"], data["artist"]);

    this.audioElem.src = data["path"];
    this.audioElem.play();

    // Update cover art
    var parser = blackbird.mm(blackbird.fs.createReadStream(data["path"]), function(err, metadata) {
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
            $("#cover-image").attr("src", dataUrl);
        }

    });
};

// Play next
blackbird.Player.prototype.next = function() {

    // API request
    var that = this;
    $.get(
        that.root + "next",
        function(data) {
            if (data != "nf") {
                that.scrobbled = false;
                var parsed = JSON.parse(data);
                that.play(parsed);
            }
        }
    );
};

// Play previous
blackbird.Player.prototype.previous = function() {

    // API request
    var that = this;
    $.get(
        that.root + "prev",
        function(data) {
            that.scrobbled = false;
            var parsed = JSON.parse(data);
            that.play(parsed);
        }
    );
};

// Seek to given position
blackbird.Player.prototype.seek = function(position) {
    this.audioElem.currentTime = position * this.audioElem.duration / 100.0;
};

// Pause/play
blackbird.Player.prototype.pause = function() {

    if (this.audioElem.paused) {
        this.audioElem.play();
        blackbird.updatePlayPause(true);
    }
    else {
        this.audioElem.pause();
        blackbird.updatePlayPause(false);
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

            // Send request to server
            $.get(
                that.root + "played",
                function(data) {
                }
            );
            that.scrobbled = true;
        }
    }
};
