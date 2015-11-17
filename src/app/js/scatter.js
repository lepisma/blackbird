// Scatter space functions
// -----------------------

var blackbird = blackbird || {};

var scatterStates = {
    current: -1,
    hover: -1
},
    canvasWidth,
    canvasHeight,
    zoom,
    xScale,
    yScale,
    canvas;

blackbird.plotScatter = function(currentId, redraw) {

    var data = blackbird.player.coords;

    if (currentId != -1) {
        scatterStates.current = currentId;
    }

    if (redraw) {
        draw();
        return;
    }

    canvasWidth = $("#scatter").width(),
    canvasHeight = $("#scatter").height();

    zoom = d3.behavior.zoom();

    xScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, data.map(function(d) {
                return d[1];
            })),
            Math.max.apply(null, data.map(function(d) {
                return d[1];
            }))])
        .range([0, canvasWidth]);

    yScale = d3.scale.linear()
        .domain([
            Math.min.apply(null, data.map(function(d) {
                return d[2];
            })),
            Math.max.apply(null, data.map(function(d) {
                return d[2];
            }))])
        .range([canvasHeight, 0]);

    canvas = d3.select("#scatter-canvas")
        .attr("width", canvasWidth)
        .attr("height", canvasHeight)
        .call(zoom.x(xScale).y(yScale).scaleExtent([1, 10]).on("zoom", zoomed))
        .node().getContext("2d");

    function zoomed() {
        draw();
    }

    $(window).resize(function() {
        resizeCanvas();
    });

    function resizeCanvas() {
        canvasHeight = $("#scatter").height();
        canvasWidth = $("#scatter").width();

        $("#scatter-canvas")[0].height = canvasHeight;
        $("#scatter-canvas")[0].width = canvasWidth;

        xScale.range([0, canvasWidth]);
        yScale.range([canvasHeight, 0]);

        draw();
    }

    // Actual canvas drawing
    function draw() {

        data = blackbird.player.coords;

        canvas.clearRect(0, 0, canvasWidth, canvasHeight);

        canvas.strokeStyle = "rgba(255, 255, 255, 0.07)";
        canvas.lineWidth = 1;

        for (var i = 0; i < 10; i++) {
            canvas.beginPath();
            canvas.moveTo(0, i * canvasHeight / 10);
            canvas.lineTo(canvasWidth, i * canvasHeight / 10);
            canvas.stroke();
        }

        for (i = 0; i < 20; i++) {
            canvas.beginPath();
            canvas.moveTo(i * canvasWidth / 20, 0);
            canvas.lineTo(i * canvasWidth / 20, canvasHeight);
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
    }

    // Bind mouse events
    canvas.canvas.addEventListener("mousemove", function(evt) {
        var mousePos = getMousePos(canvas.canvas, evt);
        // Find coordinates in coords space
        mousePos.x = xScale.invert(mousePos.x);
        mousePos.y = yScale.invert(mousePos.y);

        scatterStates.hover = getNearestPoint(mousePos);
        draw();

        blackbird.player.getData(getNearestPoint(mousePos) + 1, function(song) {
            blackbird.hoverInfo(song.title, song.artist);
        });

    }, false);

    // On Click
    canvas.canvas.addEventListener("click", function(evt) {
        if (scatterStates.hover != 1) {
            blackbird.player.singlePlay(scatterStates.hover);
        }
    }, false);

    var getMousePos = function(cv, evt) {
        var rect = cv.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) / (rect.right - rect.left) * cv.width,
            y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * cv.height
        };
    };

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

    // Draw
    draw();
};
