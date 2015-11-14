// Main script
// -----------

var blackbird = blackbird || {};

blackbird.player = {};

$(document).ready(function() {

    blackbird.player = new blackbird.Player(blackbird.api_root);

    // First play
    blackbird.player.next();

    // Create seek slider
    $("#seek-bar").slider({
        min: 0,
        max: 100,
        value: 0,
        range: "min",
        animate: true,
        slide: function(event, ui) {
            blackbird.player.seek(ui.value);
        }
    });

    // Player control logic
    $("#prev-btn").click(function() {
        blackbird.player.previous();
    });

    $("#next-btn").click(function() {
        blackbird.player.next();
    });

    $("#play-btn").click(function() {
        blackbird.player.pause();
    });

    // Command line entry
    $(document).keydown(function(e) {
        if (e.keyCode==88 && e.altKey) {
            $("#command-input").val("");
            $("#command-input").focus();
        }
    });

    // Command line
    $(document).on("keypress", "#command-input", function(e) {
        if (e.which == 13) {
            var cmd = $("#command-input").val();
            // Show loading
            $.get(
                blackbird.player.root + "command",
                {command: cmd},
                function(data) {
                    // Do things here
                }
            );
        }
    });
});
