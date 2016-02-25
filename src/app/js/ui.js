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
    if (title != null) {
        $("#hover-track").text(title);
        $("#hover-artist").text(artist);
    }
};

// Update seek position
ui.updateSeek = function(position) {
    $("#seek-bar").slider("option", "value", position);
};

// Update play/pause button
ui.updatePlayPause = function(currentState) {
    var btn = $("#play-btn"),
        animImg = $("#pause-img");

    if (currentState) {
        btn.css({"opacity": 0});
        animImg.show().addClass("zoomed");
    }
    else {
        btn.css({"opacity": 0.8});
        animImg.show().removeClass("zoomed");
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
ui.flash = function(flashType) {
    var bar = $("#foot-line");

    bar.addClass(flashType, 500, "swing");
    setTimeout(function() {
        bar.removeClass(flashType, 2000, "linear");
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

// Lastfm icon
ui.setLast = function(state) {
    if (state) {
        $(".fa-lastfm").removeClass("disabled");
    }
    else {
        $(".fa-lastfm").addClass("disabled");
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

// Fill and show metadata fields
ui.metadataShow = function(metadata) {
    $("#artist-input").val(metadata.artist);
    $("#title-input").val(metadata.title);
    $("#metadata").show();
};

// Hide and return metadata fields
ui.metadataReturn = function() {
    $("#metadata").hide();
    return {
        "artist": $("#artist-input").val(),
        "title": $("#title-input").val()
    };
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
    for (var i = 1; i <= 10; i++) {
        canvas.beginPath();
        canvas.moveTo(0, i * scatterHeight / 10);
        canvas.lineTo(scatterWidth, i * scatterHeight / 10);
        canvas.stroke();
    }

    // Draw vertical lines
    for (i = 1; i <= 20; i++) {
        canvas.beginPath();
        canvas.moveTo(i * scatterWidth / 20, 0);
        canvas.lineTo(i * scatterWidth / 20, scatterHeight);
        canvas.stroke();
    }

    // Plot circles
    var d, cx, cy;
    // Plot non active members
    canvas.beginPath();
    for (var key in data) {
        if (!data[key].shade) {
            cx = xScale(data[key].x);
            cy = yScale(data[key].y);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, 1, 0, 2 * Math.PI);
        }
    }
    canvas.fillStyle = "rgba(255, 255, 255, 0.05)";
    canvas.fill();

    // Plot active members
    canvas.beginPath();
    for (key in data) {
        if (data[key].shade) {
            cx = xScale(data[key].x);
            cy = yScale(data[key].y);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, 1.5, 0, 2 * Math.PI);
        }
    }
    canvas.fillStyle = "rgba(149, 165, 166, 0.6)";
    canvas.fill();
};

// Draw ripples on SVG
var rippleAnimate = function() {
    // Delete older ripples
    overlaySVG.selectAll("circle")
        .filter(".ripple")
        .remove();

    var datum = data[scatterStates.current];

    for (var i = 1; i < 3; i++) {
		    var circle = overlaySVG.append("circle")
            .data([datum])
            .attr("class", "ripple")
		        .attr("cx", function(d) { return xScale(d.x); })
		        .attr("cy", function(d) { return yScale(d.y); })
		        .attr("r", 0)
		        .style("stroke-width", 1)
		        .transition()
		        .delay(Math.pow(i, 3) * 70)
		        .duration(2500)
		        .ease("quad-in")
		        .attr("r", 1000)
		        .style("stroke-opacity", 0)
		        .each("end", function () {
		            d3.select(this).remove();
		        });
		}
};

// Draw hover circles
var drawHover = function() {
    // Delete old point
    overlaySVG.selectAll("circle")
        .filter(".hover")
        .remove();
    if (scatterStates.hover != -1) {
        var datum = data[scatterStates.hover];
        var circle = overlaySVG.append("circle")
            .data([datum])
            .attr("class", "hover")
            .attr("cx", function(d) { return xScale(d.x); })
            .attr("cy", function(d) { return yScale(d.y); })
            .attr("r", 5);
    }
};

// Draw similar zone
var drawSimilar = function() {
    // Delete old zone
    overlaySVG.selectAll("circle")
        .filter(".similar")
        .remove();
    if (scatterStates.similar != -1) {
        var datum = data[scatterStates.similar];
        var circle = overlaySVG.append("circle")
            .data([datum])
            .attr("class", "similar")
            .attr("cx", function(d) { return xScale(d.x); })
            .attr("cy", function(d) { return yScale(d.y); })
            .attr("r", 50);
    }
};

// Draw current playing circles
var drawCurrent = function() {
    var datum = data[scatterStates.current];

    overlaySVG.selectAll("circle")
        .filter(".current")
        .remove();

    overlaySVG.append("circle")
        .data([datum])
        .attr("class", "current")
        .attr("id", "inner")
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); })
        .attr("r", 5);

    overlaySVG.append("circle")
        .data([datum])
        .attr("class", "current")
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); })
        .attr("r", 15);
};

// Translate circles in case of scale change
var circlesTranslate = function() {
    overlaySVG.selectAll("circle")
        .attr("cx", function(d) { return xScale(d.x); })
        .attr("cy", function(d) { return yScale(d.y); });
};

// Initialize scatter plot
ui.initScatter = function(player) {
    data = player.coords;

    scatterWidth = $("#scatter").width(),
    scatterHeight = $("#scatter").height();
    zoom = d3.behavior.zoom();

    xScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, Object.keys(data).map(function(val, idx) {
                return data[val].x;
            })),
            Math.max.apply(null, Object.keys(data).map(function(val, idx) {
                return data[val].x;
            }))])
        .range([0, scatterWidth]);

    yScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, Object.keys(data).map(function(val, idx) {
                return data[val].y;
            })),
            Math.max.apply(null, Object.keys(data).map(function(val, idx) {
                return data[val].y;
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
        // Shift circles
        circlesTranslate();
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
        circlesTranslate();
    }

    // Change hover circles on mousemove
    canvas.canvas.addEventListener("mousemove", function(evt) {
        var mousePos = getMousePos(canvas.canvas, evt),
            posCoord = {},
            nearestPoint;

        // Find coordinates in coords space
        posCoord.x = xScale.invert(mousePos.x);
        posCoord.y = yScale.invert(mousePos.y);

        nearestPoint = getNearestPoint(posCoord);
        if (nearestPoint != scatterStates.hover) {
            // Only update (and run query) if needed
            scatterStates.hover = nearestPoint;
            drawHover();
            // Don't redraw on canvas everytime
            player.getData(scatterStates.hover, function(song) {
                ui.hoverInfo(song.title, song.artist, mousePos);
            });
        }
        else {
            // But keep moving the div
            ui.hoverInfo(null, null, mousePos);
        }
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

        for (var key in data) {
            if (data[key].shade) {
                if (minIdx == -1) {
                    minIdx = key;
                    minVal = distance(minIdx);
                }
                else {
                    currentVal = distance(key);
                    if (currentVal < minVal) {
                        minVal = currentVal;
                        minIdx = key;
                    }
                }
            }
        }

        // Give distance from the point
        function distance(key) {
            return Math.abs(data[key].x - point.x) + Math.abs(data[key].y - point.y);
        };

        return minIdx;
    };

    // First draw
    draw();
};

// Plot
ui.plotScatter = function(player, currentId, rip) {
    data = player.coords;

    if (currentId != -1) {
        scatterStates.current = currentId;
    }

    if (rip) {
        drawCurrent();
        rippleAnimate();
    }
    else {
        draw();
    }

    drawSimilar();
};

module.exports = ui;
