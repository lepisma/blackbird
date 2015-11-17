// Audio Visualizer
// -----------

// Initialize analyser and stuff
blackbird.initVisualizer = function(audioElem) {

    var ctx,
        source,
        context,
        analyser,
        fbcArray,
        bars,
        barWidth,
        barOpacity,
        bins,
        colorText;

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

	  context = new AudioContext();
	  analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.7;
    analyser.fftSize = 1024;
	  ctx = $("#vis")[0].getContext("2d");
	  source = context.createMediaElementSource(audioElem);
	  source.connect(analyser);
	  analyser.connect(context.destination);
    // init sizes
    bars = 40;
    bins = Math.floor(512 / bars);
    barWidth = canvas.width / bars;
    colorText = "rgba(155, 155, 155,";
	  frameLooper();
};
