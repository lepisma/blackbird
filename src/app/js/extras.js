// Extra modules

const restify = require("restify");
const lastfm = require("simple-lastfm");
const zerorpc = require("zerorpc");
const sanitize = require("sanitize-filename");
const ui = require("./ui");

var Scrobbler = function(lastfmCreds) {
    // Lastfm Scrobbler
    var that = this;
    that.active = false;
    that.lfm = new lastfm({
        api_key: lastfmCreds.api_key,
        api_secret: lastfmCreds.secret,
        username: lastfmCreds.user,
        password: lastfmCreds.password
    });
    that.enable();
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
    that.lfm.getSessionKey(function(res) {
        if (res.success) {
            that.active = true;
            ui.setIndicator("lastfm", true);
        }
    });
};

Scrobbler.prototype.disable = function() {
    // Mark as disabled, scrobbling happens if active = true
    this.active = false;
    ui.setIndicator("lastfm", false);
};

var RpcDownloadClient = function(port) {
    // Connect to youtube downloader
    this.client = new zerorpc.Client();
    this.client.connect("tcp://127.0.0.1:" + port);
};

RpcDownloadClient.prototype.parseMetadata = function(title) {
    // Return artist and track name from title
    splits = sanitize(title).split("-");
    splits.pop(); // Last element is youtube
    if (splits.length == 2) {
        return {
            "artist": splits[0].trim(),
            "title": splits[1].trim()
        };
    }
    else {
        // Return thing for user to handle
        // Don't try to be intelligent, you are not
        return {
            "artist": splits.join("-"),
            "title": splits.join("-")
        };
    }
};

RpcDownloadClient.prototype.download = function(url, metadata) {
    // Perform a download request
    this.client.invoke("save", url, metadata, function(err, res, more) {
        console.log(err);
    });
    ui.flash("ok");
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
exports.RpcDownloadClient = RpcDownloadClient;
