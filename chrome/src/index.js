var _ = require('lodash');

var Game = require('./snake');
// var Game = require('./shoot');

/*
 * SerialPort + Communication with Photon
 */

var SerialPortLib = require('../../index.js');
var SerialPort = SerialPortLib.SerialPort;

var BAUD = 9600;

let game;

function setup() {
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
}

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

    const difficultyEl = document.getElementById('sp-difficulty');
    const difficulty = difficultyEl.options[difficultyEl.selectedIndex].value;
    game = new Game(sp, difficulty);
    dashboard.textContent += 'Game inited\n';
	});

	sp.on('error', function(string) {
		dashboard.textContent += '\nError: ' + string + '\n';
	});

	sp.on('data', function(data) {
		received.textContent += data.toString();
    if (data.toString()[0] != 'd') {
      game.onData(data);
    }
	});

  document.getElementById('sp-send-data').onclick = () => {
    game.toggleData();
  };
}

setup();
