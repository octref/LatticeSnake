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

// The snake game

// Frequency of refresh in ms
const STEP_MS = 500;
const FREQ = 50;

class Game {
  constructor() {
    this.snake = [[1, 1, 1], [1, 2, 1], [1, 3, 1], [1, 4, 1]];
    this.target = [4, 4, 2];
    this.dir = 'U';
    this.alive = true;
  }

  print() {
    _.forEach(this.snake, (point) => {
      console.log(point.join(','));
    });
    console.log(this.alive ? 'alive' : 'dead');
    console.log(this.dir);
  }

  getSeq(point) {
    const [x, y, z] = point;
    let xy, seq;
    if (y % 2 == 0) {
      xy = y * 8 + x;
    } else {
      xy = y * 8 + (7 - x);
    }

    if (z % 2 == 0) {
      seq = z * 64 + xy;
    } else {
      seq = z * 64 + (63 - xy);
    }
    return seq;
  }
  
  // Transform to signal for Photon to process
  toSignal() {
    let s = _.fill(Array(256), '0');

    // Set snake
    _.forEach(this.snake, (point) => {
      const seq = this.getSeq(point);
      s[seq] = '1';
    });

    // Set target
    s[this.getSeq(this.target)] = '2';

    return s.join('') + '\n';
  }

  randomTarget() {
    let x = _.random(7),
        y = _.random(7),
        z = _.random(3);

    while (this.isPointInSnake([x, y, z], this.snake)) {
      x = _.random(7),
      y = _.random(7),
      z = _.random(3);
    }
    this.target = [x, y, z];
  }

  isPointInSnake(point, snake) {
    return _.find(snake, (p) => {
      return p[0] == point[0] &&
             p[1] == point[1] &&
             p[2] == point[2];
    })
  }

  isEqualPoints(pa, pb) {
    return pa[0] == pb[0] &&
           pa[1] == pb[1] &&
           pa[2] == pb[2];
  }

  next() {
    const [tailX, tailY, tailZ] = _.first(this.snake);
    const [headX, headY, headZ] = _.last(this.snake);

    const nextSnake = _.drop(_.cloneDeep(this.snake));

    // Early return if dead
    if (this.dir == 'U' && headY == 7 || this.dir == 'D' && headY == 0 ||
        this.dir == 'L' && headX == 0 || this.dir == 'R' && headX == 7 ||
        this.dir == 'F' && headZ == 3 || this.dir == 'B' && headZ == 0) {
      this.alive = false;
      return;
    }

    let nextPoint;
    switch (this.dir) {
      case 'U':
        nextPoint = [headX, headY + 1, headZ];
        break;
      case 'D':
        nextPoint = [headX, headY - 1, headZ];
        break;
      case 'L':
        nextPoint = [headX - 1, headY, headZ];
        break;
      case 'R':
        nextPoint = [headX + 1, headY, headZ];
        break;
      case 'F':
        nextPoint = [headX, headY, headZ + 1];
        break;
      case 'B':
        nextPoint = [headX, headY, headZ - 1];
        break;
    }

    // Head to body
    if (this.isPointInSnake(nextPoint, nextSnake)) {
      this.alive = false;
      return;
    }

    // If capturing the target, generate a new target
    if (this.isEqualPoints(nextPoint, this.target)) {
      this.randomTarget();
      this.snake.push(nextPoint);
    } else {
      nextSnake.push(nextPoint);
      this.snake = nextSnake;
    }
  }
}

window.Game = Game;
