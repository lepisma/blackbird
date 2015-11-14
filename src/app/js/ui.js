// UI functions
// ------------

var blackbird = blackbird || {};

// Update info of playback
blackbird.updateInfo = function(title, artist) {
    $("#track-name").text(title);
    $("#artist-name").text(artist);
};

// Update seek position
blackbird.updateSeek = function(position) {
    $("#seek-bar").slider("option", "value", position);
};

// Update play/pause button
blackbird.updatePlayPause = function(currentState) {
    var btn = $("#play-btn");

    if (currentState) {
        // It is playing
        btn.removeClass("fa-play");
        btn.addClass("fa-pause");
    }
    else {
        btn.removeClass("fa-pause");
        btn.addClass("fa-play");
    }
};

// Activate loading bar
blackbird.loading = function(activate) {
    var bar = $("#header");

    if (activate) {
        bar.addClass("loading");
    }
    else {
        bar.removeClass("loading");
    }
};

// Flash error
blackbird.flash = function() {
    var bar = $("#head-line");

    bar.addClass("error", 500, "swing");
    setTimeout(function() {
        bar.removeClass("error", 2000, "linear");
    }, 500);
};
