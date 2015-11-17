// Scatter space functions
// -----------------------

var blackbird = blackbird || {};

blackbird.plotScatter = function(currentId) {

    if (currentId != -1) {
        blackbird.scatterStates = {
            current: currentId
        };
    }

    var width = $("#scatter").width(),
    height = $("#scatter").height();

    var zoom = d3.behavior.zoom();

    var xValues = blackbird.coords.map(function(d) {
        return d[1];
    });
    var yValues = blackbird.coords.map(function(d) {
        return d[2];
    });

    // Hard coding scale to test things
    var x = d3.scale.linear()
        .domain([Math.min.apply(null, xValues), Math.max.apply(null, xValues)])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([Math.min.apply(null, yValues), Math.max.apply(null, yValues)])
        .range([height, 0]);

    var canvas = d3.select("#scatter-canvas")
        .attr("width", width)
        .attr("height", height)
        .call(zoom.x(x).y(y).scaleExtent([1, 10]).on("zoom", zoomed))
        .node().getContext("2d");

    draw();

    function zoomed() {
        canvas.clearRect(0, 0, width, height);
        draw();
    }

    function draw() {

        canvas.strokeStyle = "rgba(255, 255, 255, 0.07)";

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
    }

    $(window).resize(function() {
        resizeCanvas();
    });

    function resizeCanvas() {
        height = $("#scatter").height();
        width = $("#scatter").width();

        $("#scatter-canvas")[0].height = height;
        $("#scatter-canvas")[0].width = width;
        canvas.clearRect(0, 0, width, height);

        x.range([0, width]);
        y.range([height, 0]);

        draw();
    }

};
