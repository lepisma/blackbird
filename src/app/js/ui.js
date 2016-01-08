// UI functions
// ------------
// Contains interactions with html elements

var ui = {};

// Setup audio visualizer
ui.initVisualizer = function(player) {
    var canvas = $("#vis")[0],
        audioElem = player.audioElem,
        ctx = canvas.getContext("2d"),
        audioCtx = new AudioContext(),
        analyser = audioCtx.createAnalyser(),
        source = audioCtx.createMediaElementSource(audioElem);

    analyser.smoothingTimeConstant = 0.7;
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    var fbcArray,
        barOpacity,
        bars = 40,
        barWidth = canvas.width / bars,
        bins = Math.floor(512 / bars),
        colorText = "rgba(155, 155, 155, ";

    var frameLooper = function() {
	      window.requestAnimationFrame(frameLooper);
	      fbcArray = new Uint8Array(analyser.frequencyBinCount);
	      analyser.getByteFrequencyData(fbcArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < bars; i++) {
            var values = [];
            for (var x = 0; x < bins; x++) {
                values.push(fbcArray[(i * bins) + x]);
            }
            barOpacity = Math.max.apply(null, values) / 255;
            ctx.fillStyle = colorText + barOpacity + ")";
            ctx.shadowColor = colorText + barOpacity + ")";
		        ctx.fillRect(i * barWidth, 0, barWidth, canvas.height);
	      }
    };

	  frameLooper();
};

// Update info of playback
ui.updateInfo = function(title, artist, coverData) {
    $("#track-name").text(title);
    $("#artist-name").text(artist);
    $("#cover-image").attr("src", coverData);
};

// Update hover update
ui.hoverInfo  = function(title, artist, pos) {
    $("#hover-info").css({
        "top": pos.y,
        "left": pos.x
    });
    $("#hover-track").text(title.toLowerCase());
    $("#hover-artist").text(artist.toLowerCase());
};

// Update seek position
ui.updateSeek = function(position) {
    $("#seek-bar").slider("option", "value", position);
};

// Update play/pause button
ui.updatePlayPause = function(currentState) {
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
ui.loading = function(activate) {
    var bar = $("#header");

    if (activate) {
        bar.addClass("loading");
    }
    else {
        bar.removeClass("loading");
    }
};

// Flash error
ui.flash = function() {
    var bar = $("#head-line");

    bar.addClass("error", 500, "swing");
    setTimeout(function() {
        bar.removeClass("error", 2000, "linear");
    }, 500);
};

// Repeat icon
ui.setRepeat = function(state) {
    if (state) {
        $(".fa-repeat").removeClass("disabled");
    }
    else {
        $(".fa-repeat").addClass("disabled");
    }
};

// Sleep icon
ui.setSleep = function(state) {
    if (state) {
        $(".fa-moon-o").removeClass("disabled");
    }
    else {
        $(".fa-moon-o").addClass("disabled");
    }
};

// Set mode
ui.setMode = function(player, mode) {
    if (mode != "similar") {
        $("#mode").text(mode);
        scatterStates.similar = -1;
    }
    else {
        scatterStates.similar = player.sequence[player.currentIndex];
    }
};

// Scatter plot things
var scatterStates = {
    current: -1,
    hover: -1,
    similar: -1
},
    scatterWidth,
    scatterHeight,
    zoom,
    xScale,
    yScale,
    canvas,
    overlaySVG,
    data;

// Actual canvas drawing
var draw = function() {
    canvas.clearRect(0, 0, scatterWidth, scatterHeight);
    canvas.strokeStyle = "rgba(255, 255, 255, 0.07)";
    canvas.lineWidth = 1;

    // Draw horizontal lines
    for (var i = 0; i < 10; i++) {
        canvas.beginPath();
        canvas.moveTo(0, i * scatterHeight / 10);
        canvas.lineTo(scatterWidth, i * scatterHeight / 10);
        canvas.stroke();
    }

    // Draw vertical lines
    for (i = 0; i < 20; i++) {
        canvas.beginPath();
        canvas.moveTo(i * scatterWidth / 20, 0);
        canvas.lineTo(i * scatterWidth / 20, scatterHeight);
        canvas.stroke();
    }

    // Plot circles
    var d, cx, cy;
    // Plot non active members
    canvas.beginPath();
    for (i = 0; i < data.length; i++) {
        d = data[i];
        if (!d[0]) {
            cx = xScale(d[1]);
            cy = yScale(d[2]);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, 1, 0, 2 * Math.PI);
        }
    }
    canvas.fillStyle = "rgba(255, 255, 255, 0.05)";
    canvas.fill();

    // Plot active members
    canvas.beginPath();
    for (i = 0; i < data.length; i++) {
        d = data[i];
        if (d[0]) {
            cx = xScale(d[1]);
            cy = yScale(d[2]);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, 1.5, 0, 2 * Math.PI);
        }
    }
    canvas.fillStyle = "rgba(149, 165, 166, 0.6)";
    canvas.fill();

    // Currently playing track
    canvas.beginPath();
    d = data[scatterStates.current];
    cx = xScale(d[1]);
    cy = yScale(d[2]);
    canvas.arc(cx, cy, 5.0, 0, 2 * Math.PI);
    canvas.lineWidth = 2;
    canvas.strokeStyle = "rgba(41, 128, 185, 1.0)";
    canvas.stroke();
    canvas.beginPath();
    canvas.arc(cx, cy, 15.0, 0, 2 * Math.PI);
    canvas.lineWidth = 1;
    canvas.strokeStyle = "rgba(41, 128, 185, 1.0)";
    canvas.stroke();

    // Hover
    if (scatterStates.hover != -1) {
        canvas.beginPath();
        d = data[scatterStates.hover];
        cx = xScale(d[1]);
        cy = yScale(d[2]);
        canvas.arc(cx, cy, 5.0, 0, 2 * Math.PI);
        canvas.lineWidth = 4;
        canvas.strokeStyle = "rgba(41, 128, 185, 1.0)";
        canvas.stroke();
    }

    // Draw similar zone
    if (scatterStates.similar != -1) {
        d = data[scatterStates.similar];
        cx = xScale(d[1]);
        cy = yScale(d[2]);
        canvas.beginPath();
        canvas.arc(cx, cy, 50, 0, 2 * Math.PI);
        canvas.fillStyle = "rgba(41, 128, 185, 0.2)";
        canvas.fill();
    }
}

// Draw ripples on SVG
var rippleAnimate = function() {
    // Delete older ripples
    overlaySVG.selectAll("circle").
        remove();

    var datum = data[scatterStates.current];

    for (var i = 1; i < 4; i++) {
		    var circle = overlaySVG.append("circle")
            .data([datum])
		        .attr("cx", function(d) { return xScale(d[1]); })
		        .attr("cy", function(d) { return yScale(d[2]); })
		        .attr("r", 0)
		        .style("stroke-width", 2)
		        .transition()
		        .delay(Math.pow(i, 3) * 50)
		        .duration(2000)
		        .ease("quad-in")
		        .attr("r", 1000)
		        .style("stroke-opacity", 0)
		        .each("end", function () {
		            d3.select(this).remove();
		        });
		}
}

// Translate ripples in case of scale change
var rippleTranslate = function() {
    overlaySVG.selectAll("circle")
        .attr("cx", function(d) { return xScale(d[1]); })
        .attr("cy", function(d) { return yScale(d[2]); });
}

// Initialize scatter plot
ui.initScatter = function(player) {
    data = player.coords;

    scatterWidth = $("#scatter").width(),
    scatterHeight = $("#scatter").height();
    zoom = d3.behavior.zoom();

    xScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, data.map(function(d) {
                return d[1];
            })),
            Math.max.apply(null, data.map(function(d) {
                return d[1];
            }))])
        .range([0, scatterWidth]);

    yScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, data.map(function(d) {
                return d[2];
            })),
            Math.max.apply(null, data.map(function(d) {
                return d[2];
            }))])
        .range([scatterHeight, 0]);

    canvas = d3.select("#scatter-canvas")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .call(zoom.x(xScale).y(yScale).scaleExtent([1, 10]).on("zoom", zoomed))
        .node().getContext("2d");

    overlaySVG = d3.select("#scatter-overlay")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight);

    // Call draw on zooming
    function zoomed() {
        // draw canvas
        draw();
        // Shift ripples
        rippleTranslate();
    }

    $(window).resize(function() {
        resizeCanvas();
    });

    // Reset scales and canvas height, width
    function resizeCanvas() {
        scatterHeight = $("#scatter").height();
        scatterWidth = $("#scatter").width();
        $("#scatter-canvas")[0].height = scatterHeight;
        $("#scatter-canvas")[0].width = scatterWidth;
        overlaySVG
            .attr("width", scatterWidth)
            .attr("height", scatterHeight);

        xScale.range([0, scatterWidth]);
        yScale.range([scatterHeight, 0]);

        draw();
        rippleTranslate();
    }

    // Change hover circles on mousemove
    canvas.canvas.addEventListener("mousemove", function(evt) {
        var mousePos = getMousePos(canvas.canvas, evt);
        var posCoord = {};
        // Find coordinates in coords space
        posCoord.x = xScale.invert(mousePos.x);
        posCoord.y = yScale.invert(mousePos.y);

        scatterStates.hover = getNearestPoint(posCoord);
        draw();

        player.getData(scatterStates.hover, function(song) {
            ui.hoverInfo(song.title, song.artist, mousePos);
        });

    }, false);

    // Play clicked song
    canvas.canvas.addEventListener("click", function(evt) {
        if (scatterStates.hover != 1) {
            player.singlePlay(scatterStates.hover);
        }
    }, false);

    // Get relative mouse position
    var getMousePos = function(cv, evt) {
        var rect = cv.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) / (rect.right - rect.left) * cv.width,
            y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * cv.height
        };
    };

    // Get nearest points for given point
    var getNearestPoint = function(point) {
        var minIdx = -1,
            minVal,
            currentVal;

        for (i = 0; i < data.length; i++) {
            if (data[i][0]) {
                if (minIdx == -1) {
                    minIdx = i;
                    minVal = distance(minIdx);
                }
                else {
                    currentVal = distance(i);
                    if (currentVal < minVal) {
                        minVal = currentVal;
                        minIdx = i;
                    }
                }
            }
        }

        // Give distance from the point
        function distance(idx) {
            return Math.abs(data[idx][1] - point.x) + Math.abs(data[idx][2] - point.y);
        };

        return minIdx;
    };
}

// Plot
ui.plotScatter = function(player, currentId, rip) {
    data = player.coords;

    if (currentId != -1) {
        scatterStates.current = currentId;
    }

    if (rip) {
        rippleAnimate();
    }

    draw();
};

module.exports = ui;
