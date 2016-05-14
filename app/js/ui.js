// UI functions
// ------------
// Contains interactions with html elements

require("jquery-ui");
const d3 = require("d3");

var ui = {};

// Setup audio visualizer
ui.initVisualizer = function(element) {
    var canvas = $("#vis")[0],
        audioElem = element,
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
ui.updateInfo = function(data) {
    $("#track-name").text(data.title);
    $("#artist-name").text(data.artist);
    $("#cover-image").attr("src", data.cover);
};

// Update hover update
ui.hoverInfo  = function(data, pos) {
    $("#hover-info").css({
        "top": pos.y,
        "left": pos.x
    });
    if (data != null) {
        $("#hover-track").text(data.title);
        $("#hover-artist").text(data.artist);
    }
};

// Create seek slider
ui.createSeekbar = function(callback) {
    $("#seek-bar").slider({
        min: 0,
        max: 100,
        value: 0,
        range: "min",
        animate: true,
        slide: function(event, ele) {
            callback(ele.value);
        }
    });
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

// Set state indicators
ui.setIndicator = function(name, state) {
    var elements = {
        "repeat": ".fa-repeat",
        "lastfm": ".fa-lastfm",
        "sleep": ".fa-moon-o"
    };
    if (state) {
        $(elements[name]).removeClass("disabled");
    }
    else {
        $(elements[name]).addClass("disabled");
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
    $("#metadata-wrap").fadeIn();
    $("#title-input").focus();
};

// Hide and return metadata fields
ui.metadataReturn = function() {
    $("#metadata-wrap").fadeOut();
    return {
        artist: $("#artist-input").val(),
        title: $("#title-input").val()
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

    var cx, cy;

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

// Draw circles
var drawCircle = function(type) {

    // Clear old elements
    overlaySVG.selectAll("circle")
        .filter("." + type)
        .remove();

    if (type == "hover") {
        if (scatterStates.hover != -1) {
            appendCircle(overlaySVG, type, 5, data[scatterStates.hover]);
        }
    }
    else if (type == "similar") {
        if (scatterStates.similar != -1) {
            appendCircle(overlaySVG, type, 50, data[scatterStates.similar]);
        }
    }
    else if (type == "current") {
        appendCircle(overlaySVG, type, 5, data[scatterStates.current]);
        overlaySVG.selectAll("circle")
            .filter("." + type)
            .attr("id", "inner");
        appendCircle(overlaySVG, type, 15, data[scatterStates.current]);
    }

    function appendCircle(svg, cls, r, datum) {
        svg.append("circle")
            .data([datum])
            .attr("class", cls)
            .attr("cx", function(d) { return xScale(d.x); })
            .attr("cy", function(d) { return yScale(d.y); })
            .attr("r", r);
    };
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
    var zoom = d3.behavior.zoom();

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
        draw();
        circlesTranslate();
    }

    // On resize
    $(window).resize(function() {
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
    });

    // Mouse events
    var mouseDown = false,
        dragging = false;

    // Change hover circles on mousemove
    canvas.canvas.addEventListener("mousemove", function(evt) {
        dragging = mouseDown;

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
            drawCircle("hover");
            player.getData(scatterStates.hover, function(song) {
                ui.hoverInfo(song, mousePos);
            });
        }
        else {
            // But keep moving the div
            ui.hoverInfo(null, mousePos);
        }
    });

    canvas.canvas.addEventListener("mousedown", function(evt) {
        mouseDown = true;
    });

    // Play clicked song
    canvas.canvas.addEventListener("mouseup", function(evt) {
        if ((!dragging) && (scatterStates.hover != 1)) {
            player.singlePlay(scatterStates.hover);
        }
        dragging = mouseDown = false;
    });

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

        return parseInt(minIdx);
    };

    // First draw
    draw();
};

ui.plotTrackChange = function(currentId) {
    // Show animation for track change
    scatterStates.current = currentId;
    drawCircle("current");
    rippleAnimate();
};

ui.updateScatter = function(coords) {
    // Draw updated data
    data = coords;
    draw();
    // Update similar circle if there
    drawCircle("similar");
};

module.exports = ui;
