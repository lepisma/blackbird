// Main script
// -----------

var blackbird = blackbird || {};

$(document).ready(function() {

    blackbird.player = new blackbird.Player(blackbird.config.db, function() {
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

        // Create visualizer
        blackbird.initVisualizer(blackbird.player.audioElem);

        // Hot start scatter
        blackbird.player.genCoords(function() {
            blackbird.plotScatter(blackbird.player.sequence[blackbird.player.currentIndex], false);
        });

        // First play
        blackbird.player.next();
    });

    // Player control logic
    $("#prev-btn").click(function() {
        blackbird.player.previous();
    });

    $("#next-btn").click(function() {
        blackbird.player.next();
    });

    $("#play-btn").click(function() {
        blackbird.player.pause(function(playState) {
            blackbird.updatePlayPause(playState);
        });
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
            blackbird.loading(true);
            blackbird.player.execute(cmd, function(data) {
                if ((data == "nf") || (data.length != 2)) {
                    blackbird.flash();
                }
                else {
                    if (data[0] == "m") {
                        blackbird.setMode(data[1]);
                        blackbird.player.genCoords(function() {
                            blackbird.plotScatter(-1, true);
                        });
                    }
                    else if (data[0] == "r") {
                        blackbird.setRepeat(data[1]);
                    }
                    else if (data[0] == "s") {
                        blackbird.setSleep(data[1]);
                    }
                }
                blackbird.loading(false);
            });
        }
    });
});
