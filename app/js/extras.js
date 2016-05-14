// Extra modules

const restify = require("restify");
const lastfm = require("simple-lastfm");
const sanitize = require("sanitize-filename");
const ytdl = require("youtube-dl");
const id3 = require("node-id3");
const path = require("path");
const ui = require("./ui");

var Scrobbler = function(lastfmCreds) {
    // Lastfm Scrobbler
    var that = this;
    if (lastfmCreds.user != "") {
        that.active = false;
        that.lfm = new lastfm({
            api_key: lastfmCreds.api,
            api_secret: lastfmCreds.secret,
            username: lastfmCreds.user,
            password: lastfmCreds.password
        });
        that.enable();
    }
    else {
        that.disable();
    }
};

Scrobbler.prototype.scrobble = function(data) {
    this.lfm.scrobbleTrack({
        artist: data.artist,
        track: data.title,
        callback: function(res) {
            //
        }
    });
};

Scrobbler.prototype.love = function(data, callback) {
    this.lfm.loveTrack({
        artist: data.artist,
        track: data.title,
        callback: callback
    });
};

Scrobbler.prototype.enable = function() {
    // Get session key and activate scrobbling
    var that = this;
    if (that.lfm) {
        that.lfm.getSessionKey(function(res) {
            if (res.success) {
                that.active = true;
                ui.setIndicator("lastfm", true);
            }
        });
    }
    else {
        console.log("Lastfm credentials not found");
    }
};

Scrobbler.prototype.disable = function() {
    // Mark as disabled, scrobbling happens if active = true
    this.active = false;
    ui.setIndicator("lastfm", false);
};

var Downloader = function(downloadDir) {
    this.downloadDir = downloadDir;
};

Downloader.prototype.parseMetadata = function(title) {
    // Return artist and track name from title
    splits = sanitize(title).split("-");
    splits.pop(); // Last element is youtube
    if (splits.length == 2) {
        return {
            artist: splits[0].trim(),
            title: splits[1].trim()
        };
    }
    else {
        // Return thing for user to handle
        // Don't try to be intelligent, you are not
        return {
            artist: splits.join("-"),
            title: splits.join("-")
        };
    }
};

Downloader.prototype.download = function(url, metadata) {
    var filename = metadata.artist + "-" + metadata.title;
    filename = path.join(this.downloadDir, filename);
    ytdl.exec(url, [
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--no-playlist",
        "--prefer-ffmpeg",
        "--output",
        filename + ".%(ext)s"
    ], {}, function(err, output) {
        if (err) {
            ui.flash("error");
            console.log(err);
        }
        console.log(output.join("\n"));

        // Write tags
        var tags = {
            title: metadata.title,
            artist: metadata.artist
        };
        if (id3.write(tags, filename + ".mp3") == false) {
            ui.flash("error");
        }
        else {
            ui.flash("ok");
        }
    });
};

var API = function(player, port) {
    this.server = restify.createServer();

    // Setup api points
    this.server.get("/current", function(req, res, next) {
        res.send(player.currentData);
        next();
    });

    this.server.get("/next", function(req, res, next) {
        player.next();
        res.send("ok");
        next();
    });

    this.server.get("/previous", function(req, res, next) {
        player.previous();
        res.send("ok");
        next();
    });

    this.server.get("/play", function(req, res, next) {
        player.pause(function(playState) {
            ui.updatePlayPause(playState);
        });
        res.send("ok");
        next();
    });

    this.server.listen(port);
};

exports.Scrobbler = Scrobbler;
exports.API = API;
exports.Downloader = Downloader;
