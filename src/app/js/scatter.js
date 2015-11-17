// Scatter space functions
// -----------------------

var blackbird = blackbird || {};

blackbird.plotScatter = function(data) {

    var width = $("#scatter").width(),
    height = $("#scatter").height();

    var zoom = d3.behavior.zoom();

    // Hard coding scale to test things
    var x = d3.scale.linear()
        .domain([-15, 15])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([-15, 15])
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

        for (var i = 0; i < 20; i++) {
            canvas.beginPath();
            canvas.moveTo(i * width / 20, 0);
            canvas.lineTo(i * width / 20, height);
            canvas.stroke();
        }

        var i = -1, n = data.length, d, cx, cy;
        canvas.beginPath();
        while (++i < n) {
            d = data[i];
            cx = x(d.x);
            cy = y(d.y);
            canvas.moveTo(cx, cy);
            canvas.arc(cx, cy, 1.5, 0, 2 * Math.PI);
        }
        canvas.fillStyle = "rgba(255, 255, 255, 0.1)";
        canvas.fill();
    }

    $(window).resize(function() {
        resizeCanvas();
    });

    function resizeCanvas() {
        zoom.scale(1);
        zoom.translate([0, 0]);
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
