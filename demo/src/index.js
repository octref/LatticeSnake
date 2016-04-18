var _ = require('lodash');

/*
 * SerialPort + Communication with Photon
 */

var SerialPortLib = require('../../index.js');
var SerialPort = SerialPortLib.SerialPort;

var BAUD = 9600;

// Get a list of available connections and populate the dropdown
SerialPortLib.list(function(err, ports) {
	var portsPath = document.getElementById("sp-portPath");

	if (err) {
		console.log("Error listing ports", err);
		portsPath.options[0] = new Option(err, "ERROR:" + err);
		portsPath.options[0].selected = true;
		return;
	} else {
		for (var i = 0; i < ports.length; i++) {
			portsPath.options[i] = new Option(ports[i].comName, ports[i].comName);

			if (ports[i].comName.toLowerCase().indexOf("usb") !== -1) {
				portsPath.options[i].selected = true;
			}
		}

		var connectButton = document.getElementById("sp-connect");
		connectButton.onclick = function() {
			var port = portsPath.options[portsPath.selectedIndex].value;
			connect(port);
      console.log('Connecting to ' + port);
		};
	}
});

function connect(port) {
	var sp = new SerialPort(port, {
    baudrate: BAUD,
    buffersize: 1
	}, true);

  var dashboard = document.getElementById('sp-dashboard'),
      received  = document.getElementById('sp-received');

	sp.on('open', function() {
		dashboard.textContent += 'Connection open\n';
	});

	sp.on('error', function(string) {
		dashboard.textContent += '\nError: ' + string + '\n';
	});

	sp.on('data', function(data) {
    console.log('Received: ' + data);
		received.textContent += data.toString();
	});

	function send() {
    var input = document.getElementById('sp-input');
		var line = input.value;
		input.value = '';
		sp.write(line + '\n');
    dashboard.textContent += 'Sent ' + line + '\n';
	}

  function sendData() {
    var relNote = analyzePitch();
    var vol = analyzeVolume();

    if (relNote < 10) {
      var line = '0' + relNote +  vol + '\n';
    } else {
      var line = '' + relNote + vol + '\n';
    }
    sp.write(line);
    dashboard.textContent += 'Sent ' + line;
  }

	document.getElementById('sp-send').addEventListener('click', send);
	document.getElementById('sp-input').onkeypress = (e) => {
		if (e.which == 13) { send(); }
	};

  var sendDataInterval = null;
  document.getElementById('sp-send-data').onclick = () => {
    if (sendDataInterval) {
      clearInterval(sendDataInterval);
      sendDataInterval = null;
    } else {
      sendDataInterval = setInterval(sendData, 100);
    }
  };
}

/*
 * Pitch Detection
 */
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, 
  canvasElem,
  waveCanvas,
  pitchElem,
  noteElem,
  detuneElem,
  detuneAmount;

window.onload = function() {
  audioContext = new AudioContext();
  MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));  // corresponds to a 5kHz signal

  detectorElem = document.getElementById("detector");
  canvasElem = document.getElementById("output");
  DEBUGCANVAS = document.getElementById("waveform");
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "black";
    waveCanvas.lineWidth = 1;
  }
  pitchElem = document.getElementById("pitch");
  noteElem = document.getElementById("note");
  detuneElem = document.getElementById("detune");
  detuneAmount = document.getElementById("detune_amt");

  // Bind events to buttons
  document.getElementById('live-input').onclick = toggleLiveInput;
  var printDataInterval = null;
  document.getElementById('print-data').onclick = () => {
    if (printDataInterval) {
      clearInterval(printDataInterval);
      printDataInterval = null;
    } else {
      printDataInterval = setInterval(() => {
        console.log(analyzePitch());
        console.log(analyzeVolume());
      }, 100);
    }
  };
};

function getUserMedia(dictionary, callback) {
  try {
    navigator.getUserMedia = 
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;
    navigator.getUserMedia(dictionary, callback, function() {
      alert('Stream generation failed.');
    });
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Connect it to the destination.
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  mediaStreamSource.connect(analyser);
  updatePitch();
}

function toggleLiveInput() {
    if (isPlaying) {
      // Stop playing and return
      sourceNode.stop(0);
      sourceNode = null;
      analyser = null;
      isPlaying = false;

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
      window.cancelAnimationFrame(rafID);
    }

    getUserMedia({
      "audio": {
        "mandatory": {
          "googEchoCancellation": "false",
          "googAutoGainControl": "false",
          "googNoiseSuppression": "false",
          "googHighpassFilter": "false"
        },
        "optional": []
      }
    }, gotStream);
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array(buflen);

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
  var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2) );
  return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note - 69) / 12);
}

function centsOffFromPitch( frequency, note ) {
  return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2) );
}

// this is a float version of the algorithm below - but it's not currently used.
/*
function autoCorrelateFloat( buf, sampleRate ) {
  var MIN_SAMPLES = 4;  // corresponds to an 11kHz signal
  var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
  var SIZE = 1000;
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;

  if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
    return -1;  // Not enough data

  for (var i=0;i<SIZE;i++)
    rms += buf[i]*buf[i];
  rms = Math.sqrt(rms/SIZE);

  for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<SIZE; i++) {
      correlation += Math.abs(buf[i]-buf[i+offset]);
    }
    correlation = 1 - (correlation/SIZE);
    if (correlation > best_correlation) {
      best_correlation = correlation;
      best_offset = offset;
    }
  }
  if ((rms>0.1)&&(best_correlation > 0.1)) {
    console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
  }
//  var best_frequency = sampleRate/best_offset;
}
*/

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

function autoCorrelate(buf, sampleRate) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i = 0;i < SIZE; i++) {
    var val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) // not enough signal
    return -1;

  var lastCorrelation=1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buf[i] - buf[i+offset]);
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation > 0.9) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
      // Now we need to tweak the offset - by interpolating between the values to the left and right of the
      // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
      // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
      // (anti-aliased) offset.

      // we know best_offset >=1, 
      // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
      // we can't drop into this clause until the following pass (else if).
      var shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];  
      return sampleRate / (best_offset + (8 * shift));
    }
    lastCorrelation = correlation;
  }
  if (best_correlation > 0.01) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    return sampleRate/best_offset;
  }
  return -1;
//  var best_frequency = sampleRate/best_offset;
}

function updatePitch() {
  var cycles = new Array;
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, audioContext.sampleRate);
  // TODO: Paint confidence meter on canvasElem here.

  if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
    waveCanvas.clearRect(0, 0, 512, 256);
    waveCanvas.strokeStyle = "red";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,0);
    waveCanvas.lineTo(0,256);
    waveCanvas.moveTo(128,0);
    waveCanvas.lineTo(128,256);
    waveCanvas.moveTo(256,0);
    waveCanvas.lineTo(256,256);
    waveCanvas.moveTo(384,0);
    waveCanvas.lineTo(384,256);
    waveCanvas.moveTo(512,0);
    waveCanvas.lineTo(512,256);
    waveCanvas.stroke();
    waveCanvas.strokeStyle = "black";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,buf[0]);
    for (var i=1;i<512;i++) {
      waveCanvas.lineTo(i,128+(buf[i]*128));
    }
    waveCanvas.stroke();
  }

  if (ac == -1) {
    detectorElem.className = "vague";
    pitchElem.innerText = "--";
    noteElem.innerText = "-";
    detuneElem.className = "";
    detuneAmount.innerText = "--";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    pitchElem.innerText = Math.round(pitch) ;
    var note = noteFromPitch( pitch );
    noteElem.innerHTML = noteStrings[note%12];
    var detune = centsOffFromPitch(pitch, note);
    if (detune == 0) {
      detuneElem.className = "";
      detuneAmount.innerHTML = "--";
    } else {
      if (detune < 0)
        detuneElem.className = "flat";
      else
        detuneElem.className = "sharp";
      detuneAmount.innerHTML = Math.abs( detune );
    }
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame(updatePitch);
}

// relNote 0 - 12
function analyzePitch() {
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, audioContext.sampleRate);

  var pitch = ac,
      pitchStr = Math.round(pitch),
      note = noteFromPitch(pitch),
      relNote = note % 12,
      noteStr = noteStrings[relNote],
      detune = centsOffFromPitch(pitch, note);
  
  if (isNaN(relNote)) { relNote = 0; }

  return relNote;
}

// 0 - 40 -> 1 - 4 for now
function analyzeVolume() {
  var vol = Math.ceil(Math.abs(_.mean(buf) * 500));
  if (vol > 4) { vol = 4; }
  return vol;
}
