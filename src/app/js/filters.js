// Filter functions
// ----------------

const utils = require("./utils");

var artist = function(player, args, callback) {
    // Songs from current artist
    saveFreemodeIndex(player);

    var query = {
        "sql": "SELECT id FROM items WHERE artist = ?",
        "param": player.currentData.artist
    };
    sqlfilter(query, "artist", player, callback);
};

var album = function(player, args, callback) {
    // Songs from current album
    saveFreemodeIndex(player);

    var query = {
        "sql": "SELECT id FROM items WHERE album = ?",
        "param": player.currentData.album
    };
    sqlfilter(query, "album", player, callback);
};

var search = function(player, args, callback) {
    // Search results
    saveFreemodeIndex(player);

    var query = {
        "sql": "SELECT id FROM items WHERE (artist || ' ' || title || ' ' || album) like '%' || ? || '%'",
        "param": args.join(" ")
    };
    sqlfilter(query, "search", player, callback);
};

var similar = function(player, args, callback) {
    // Sort sequence in order of similarity with current song
    saveFreemodeIndex(player);

    var distances = [];
    var anchorPoint = player.coords[player.sequence[player.currentIndex]],
        currentPoint;

    for (var i = 0; i < player.sequence.length; i++) {
        currentPoint = player.coords[player.sequence[i]];
        console.log(i);
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
            var query = {
                "sql": "SELECT id FROM items WHERE artist IN (SELECT artist FROM items GROUP BY artist HAVING count(*) <= ?)",
                "param": cap
            };
            sqlfilter(query, "cap", player, callback);
        }
    }
};

// Common functions

var sqlfilter = function(query, name, player, callback) {
    // General sql filter on beetsDb
    var seq = [];
    player.beetsDb.all(query.sql, query.param, function(err, rows) {
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

            callback(["m", name]);
        }
    });
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
