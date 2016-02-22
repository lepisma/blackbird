// Utility functions

var shuffle = function(array) {
    // Shuffle array
    var idx = array.length,
        temporaryValue,
        randomIdx ;

    while (0 !== idx) {
        // Pick a remaining element
        randomIdx = Math.floor(Math.random() * idx);
        idx -= 1;
        temporaryValue = array[idx];
        array[idx] = array[randomIdx];
        array[randomIdx] = temporaryValue;
    }
    return array;
};

var argsort = function(array) {
    // Sort array in increasing order (in place) and return indices
    for (var i = 0; i < array.length; i++) {
        array[i] = [i, array[i]];
    }

    array.sort(function(a, b) {
        return a[1] - b[1];
    });

    var sortedIndices = [];
    for (i = 0; i < array.length; i++) {
        sortedIndices.push(array[i][0]);
        array[i] = array[i][1];
    }

    return sortedIndices;
};

var parseMetadata = function(title) {
    // Return artist and track name from title
    splits = title.split("-");
    if (splits.length == 3) {
        // Last element is "Youtube"
        return {
            "artist": splits[0].trim(),
            "title": splits[1].trim()
        };
    }
    else {
        // Return thing for user to handle
        // Don't try to be intelligent, you are not
        return {
            "artist": title,
            "title": title
        };
    }
};

exports.shuffle = shuffle;
exports.argsort = argsort;
exports.parseMetadata = parseMetadata;
