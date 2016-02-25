// Filter functions
// ----------------

const utils = require("./utils");

var artist = function(player, args, callback) {
    // Songs from current artist
    saveFreemodeIndex(player);

    var seq = [];
    player.beetsDb.all("SELECT id FROM items WHERE artist = ?", player.currentData.artist, function(err, rows) {
        rows.forEach(function(row) {
            seq.push(row.id);
        });
        player.seqCount = seq.length;
        seq = utils.shuffle(seq);
        player.sequence = seq;
        player.currentIndex = 0;

        callback(["m", "artist"]);
    });
};

var album = function(player, args, callback) {
    // Songs from current album
    saveFreemodeIndex(player);

    var seq = [];
    player.beetsDb.all("SELECT id FROM items WHERE album = ?", player.currentData.album, function(err, rows) {
        rows.forEach(function(row) {
            seq.push(row.id);
        });
        player.seqCount = seq.length;
        seq = utils.shuffle(seq);
        player.sequence = seq;
        player.currentIndex = 0;

        callback(["m", "album"]);
    });
};

var search = function(player, args, callback) {
    // Search results
    saveFreemodeIndex(player);

    var seq = [];
    player.beetsDb.all("SELECT id FROM items WHERE (artist || ' ' || title || ' ' || album) like '%' || ? || '%'", args.join(" "), function(err, rows) {
        rows.forEach(function(row) {
            seq.push(row.id);
        });
        if (seq.length == 0) {
            callback("nf");
        }
        else {
            player.seqCount = seq.length;
            seq = utils.shuffle(seq);
            player.sequence = seq;
            player.currentIndex = 0;

            callback(["m", "search"]);
        }
    });
};

var similar = function(player, args, callback) {
    // Sort sequence in order of similarity with current song
    saveFreemodeIndex(player);

    var distances = [];
    var anchorPoint = player.coords[player.sequence[player.currentIndex]],
        currentPoint;

    for (var i = 0; i < player.sequence.length; i++) {
        currentPoint = player.coords[player.sequence[i]];
        distances.push(Math.abs(anchorPoint.x - currentPoint.x) +
                       Math.abs(anchorPoint.y - currentPoint.y));
    }

    var similarIndices = utils.argsort(distances);
    seq = [];

    for (i = 0; i < similarIndices.length; i++) {
        seq.push(player.sequence[similarIndices[i]]);
    }
    player.sequence = seq;
    player.currentIndex = 0;

    callback(["m", "similar"]);
};

var artistCap = function(player, args, callback) {
    // Put an upper limit on song count by artist
    saveFreemodeIndex(player);

    if (isNaN(args[0])) {
        callback("nf");
    }
    else {
        var cap = parseInt(args[0]);
        if (cap <= 0) {
            callback("nf");
        }
        else {
            var seq = [];
            player.beetsDb.all("SELECT id FROM items WHERE artist IN (SELECT artist FROM items GROUP BY artist HAVING count(*) <= ?)", cap, function(err, rows) {
                rows.forEach(function(row) {
                    seq.push(row.id);
                });
                if (seq.length == 0) {
                    callback("nf");
                }
                else {
                    player.seqCount = seq.length;
                    seq = utils.shuffle(seq);
                    player.sequence = seq;
                    player.currentIndex = 0;

                    callback(["m", "cap"]);
                }
            });
        }
    }
};

var saveFreemodeIndex = function(player) {
    // Save state for free mode if not already saved
    if (!player.freemodeSave) {
        player.freemodeSave = player.currentIndex;
    }
};

exports.artist = artist;
exports.album = album;
exports.search = search;
exports.similar = similar;
exports.artistCap = artistCap;
