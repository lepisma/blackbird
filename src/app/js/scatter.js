// Scatter space functions
// -----------------------

var blackbird = blackbird || {};

blackbird.scatterStates = {
    current: -1,
    hover: -1
};

var width,
    height,
    xValues,
    yValues,
    zoom,
    x,
    y,
    canvas;

blackbird.plotScatter = function(currentId, redraw) {

    if (currentId != -1) {
        blackbird.scatterStates.current = currentId;
    }

    if (redraw) {
        draw();
        return;
    }

    width = $("#scatter").width(),
    height = $("#scatter").height();

    zoom = d3.behavior.zoom();

    xValues = blackbird.coords.map(function(d) {
        return d[1];
    });
    yValues = blackbird.coords.map(function(d) {
        return d[2];
    });

    // Hard coding scale to test things
    x = d3.scale.linear()
        .domain([Math.min.apply(null, xValues), Math.max.apply(null, xValues)])
        .range([0, width]);

    y = d3.scale.linear()
        .domain([Math.min.apply(null, yValues), Math.max.apply(null, yValues)])
        .range([height, 0]);

    canvas = d3.select("#scatter-canvas")
        .attr("width", width)
        .attr("height", height)
        .call(zoom.x(x).y(y).scaleExtent([1, 10]).on("zoom", zoomed))
        .node().getContext("2d");

    function zoomed() {
        draw();
    }

    $(window).resize(function() {
        resizeCanvas();
    });

    function resizeCanvas() {
        height = $("#scatter").height();
        width = $("#scatter").width();

        $("#scatter-canvas")[0].height = height;
        $("#scatter-canvas")[0].width = width;

        x.range([0, width]);
        y.range([height, 0]);

        draw();
    }

    // Actual canvas drawing
    function draw() {

        canvas.clearRect(0, 0, width, height);

        canvas.strokeStyle = "rgba(255, 255, 255, 0.07)";
        canvas.lineWidth = 1;

        for (var i = 0; i < 10; i++) {
            canvas.beginPath();
            canvas.moveTo(0, i * height / 10);
            canvas.lineTo(width, i * height / 10);
            canvas.stroke();
        }

        for (i = 0; i < 20; i++) {
            canvas.beginPath();
            canvas.moveTo(i * width / 20, 0);
            canvas.lineTo(i * width / 20, height);
            canvas.stroke();
        }

        // Plot circles
        var d, cx, cy;
        // Plot non active members
        canvas.beginPath();
        for (i = 0; i < blackbird.coords.length; i++) {
            d = blackbird.coords[i];
            if (!d[0]) {
                cx = x(d[1]);
                cy = y(d[2]);
                canvas.moveTo(cx, cy);
                canvas.arc(cx, cy, 1, 0, 2 * Math.PI);
            }
        }
        canvas.fillStyle = "rgba(255, 255, 255, 0.05)";
        canvas.fill();

        // Plot active members
        canvas.beginPath();
        for (i = 0; i < blackbird.coords.length; i++) {
            d = blackbird.coords[i];
            if (d[0]) {
                cx = x(d[1]);
                cy = y(d[2]);
                canvas.moveTo(cx, cy);
                canvas.arc(cx, cy, 1.5, 0, 2 * Math.PI);
            }
        }
        canvas.fillStyle = "rgba(149, 165, 166, 0.6)";
        canvas.fill();

        // Currently playing track
        canvas.beginPath();
        d = blackbird.coords[blackbird.scatterStates.current];
        cx = x(d[1]);
        cy = y(d[2]);
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
        if (blackbird.scatterStates.hover != -1) {
            canvas.beginPath();
            d = blackbird.coords[blackbird.scatterStates.hover];
            cx = x(d[1]);
            cy = y(d[2]);
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
        // TODO: fix this
        mousePos.x = x.invert((mousePos.x / zoom.scale()) + zoom.translate()[0]);
        mousePos.y = y.invert((mousePos.y / zoom.scale()) + zoom.translate()[1]);

        blackbird.scatterStates.hover = getNearestPoint(mousePos);
        draw();

        blackbird.player.db.get("SELECT * FROM SONGS WHERE id = ?", getNearestPoint(mousePos) + 1, function(err, row) {
            blackbird.hoverInfo(row.title, row.artist);
        });

    }, false);

    // On Click
    canvas.canvas.addEventListener("click", function(evt) {
        if (blackbird.scatterStates.hover != 1) {
            blackbird.player.singlePlay(blackbird.scatterStates.hover);
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

        for (i = 0; i < blackbird.coords.length; i++) {
            if (blackbird.coords[i][0]) {
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
            return Math.abs(blackbird.coords[idx][1] - point.x) + Math.abs(blackbird.coords[idx][2] - point.y);
        };

        return minIdx;
    };

    // Draw
    draw();
};
