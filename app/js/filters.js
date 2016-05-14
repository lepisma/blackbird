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

    // Generate query
    // + is union
    // - is exception
    // others are intersected

    // Clean up continuous repetitions
    var cleaned = args.filter(function(item, index, arr) {
        return (index == 0) || (item != arr[index-1]);
    });

    // Remove first +
    if (cleaned[0] == "+") {
        cleaned.shift();
    }
    // Remove ending operators +/-
    while (["+", "-"].indexOf(cleaned[cleaned.length-1]) > -1) {
        cleaned.pop();
    }

    var sql = [],
        param = [],
        inWords = false;
    // Wrap around
    sql.push("SELECT id FROM");
    cleaned.forEach(function(item, index) {
        if (item == "+") {
            if ((!inWords) && (index != 0)) {
                // Override previous operator
                sql.pop();
            }
            // Apply operator
            sql.push(") UNION SELECT id FROM (");
            inWords = false;
        }
        else if (item == "-") {
            if (index == 0) {
                // First -
                sql.push("( SELECT id FROM items");
            }
            else if (!inWords) {
                // Override previous operator
                sql.pop();
            }
            // Apply operator
            sql.push(") EXCEPT SELECT id FROM (");
            inWords = false;
        }
        else {
            if (inWords) {
                sql.push("INTERSECT");
            }
            else if (index == 0 ){
                sql.push("(");
            }
            sql.push("SELECT id FROM items WHERE (artist || ' ' || title || ' ' || album) like '%' || ? || '%'");
            param.push(item);
            inWords = true;
        }
    });
    // Close
    sql.push(")");

    var query = {
        "sql": sql.join(" "),
        "param": param
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

var newN = function(player, args, callback) {
    // Return N newly added songs
    saveFreemodeIndex(player);

    if (isNaN(args[0])) {
        callback("nf");
    }
    else {
        var N = parseInt(args[0]);
        if (N <= 0) {
            callback("nf");
        }
        else {
            var query = {
                "sql": "SELECT id FROM items ORDER BY added DESC LIMIT ?",
                "param": N
            };
            sqlfilter(query, "new", player, callback);
        }
    }
};

// Common functions

var sqlfilter = function(query, name, player, callback) {
    // General sql filter on beetsDb
    var seq = [];
    player.beetsDb.all(query.sql, query.param, function(err, rows) {
        if (err) {
            console.log(err);
            callback("nf");
        }
        else {
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
exports.newN = newN;
