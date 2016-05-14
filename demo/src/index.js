var _ = require('lodash');

var Game = require('./snake');

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

// Frequency of refresh in ms
const STEP_MS = 500;
const FREQ = 50;

let snakeGame;
let msCount = 0;

// Connect to the port
function connect(port) {
	var sp = new SerialPort(port, {
    baudrate: BAUD,
    buffersize: 1
	}, true);

  var dashboard = document.getElementById('sp-dashboard'),
      received  = document.getElementById('sp-received');

	sp.on('open', function() {
		dashboard.textContent += 'Connection open\n';
    snakeGame = new Game();
    dashboard.textContent += 'Game inited\n';
	});

	sp.on('error', function(string) {
		dashboard.textContent += '\nError: ' + string + '\n';
	});

	sp.on('data', function(data) {
		received.textContent += data.toString();
    if (data.toString()[0] != 'd') {
      const [hor, ver, spa] = data.toString().split(',');

      let nextDir = snakeGame.dir;
      if (hor > 3000) {
        nextDir = 'L';
      } else if (hor < 1000) {
        nextDir = 'R';
      }

      if (ver > 3000) {
        nextDir = 'F';
      } else if (ver < 1000) {
        nextDir = 'B';
      }

      if (spa > 3000) {
        nextDir = 'U';
      } else if (spa < 1000) {
        nextDir = 'D';
      }
      if (_.includes(['UD', 'DU', 'LR', 'RL', 'FB', 'BF'], snakeGame.dir + nextDir)) {
        return;
      }
      snakeGame.dir = nextDir;
      console.log('Dir: ', snakeGame.dir);
    }
	});

	function send() {
    var input = document.getElementById('sp-input');
		var line = input.value;
		input.value = '';
		sp.write(line + '\n');
    dashboard.textContent += 'Sent ' + line + '\n';
	}

  function sendData() {
    if (msCount * STEP_MS % FREQ == 0) {
      snakeGame.next();
      snakeGame.print();
      sp.write(snakeGame.toSignal());
      dashboard.textContent += 'Sent ' + snakeGame.toSignal();
    }
    msCount++;
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
      sendDataInterval = setInterval(sendData, FREQ);
    }
  };
}
