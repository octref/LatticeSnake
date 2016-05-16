/*
 * The snake game
 */

const CTL_LOWER = 4096 / 4;
const CTL_UPPER = 4096 / 4 * 3;
const CTL_MID = 4096 / 2;

const HAPPY_FACE = [[2, 1, 0], [3, 1, 0], [4, 1, 0], [5, 1, 0],
                    [1, 2, 0], [6, 2, 0],
                    [1, 4, 0], [2, 4, 0], [5, 4, 0], [6, 4, 0],
                    [1, 5, 0], [2, 5, 0], [5, 5, 0], [6, 5, 0]];
const SAD_FACE = [[1, 1, 0], [6, 1, 0],
                  [2, 2, 0], [3, 2, 0], [4, 2, 0], [5, 2, 0],
                  [1, 4, 0], [2, 4, 0], [5, 4, 0], [6, 4, 0],
                  [1, 5, 0], [2, 5, 0], [5, 5, 0], [6, 5, 0]];

const SNAKE_LOGO = [[3, 1, 0], [4, 1, 0],
                    [2, 2, 0], [5, 2, 0],
                    [4, 3, 0],
                    [3, 4, 0],
                    [2, 5, 0], [5, 5, 0],
                    [3, 6, 0], [4, 6, 0]];

const bgm  = new Audio('audio/bgm.mp3');
const bite = new Audio('audio/bite.mp3');
const win  = new Audio('audio/win.mp3');
const lose = new Audio('audio/lose.mp3');

class SnakeGame {
  constructor(sp, difficulty) {
    this.sp = sp;
    // When sp in game is writing
    this.spActive = false;

    this.sendDataInterval = null;
    this.sendCount = 0;

    this.difficulty = difficulty;
    if (difficulty == 'easy') {
      this.settings = {
        FREQ: 50,
        STEP_MS: 250
      };
    } else if (difficulty == 'hard') {
      this.settings = {
        FREQ: 50,
        STEP_MS: 1200
      };
    } else {
      this.settings = {
        FREQ: 50,
        STEP_MS: 400
      };
    }

    this.snake = [[1, 1, 1], [1, 2, 1], [1, 3, 1]];
    this.target = [4, 4, 3];
    this.dir = 'U';
    this.alive = true;

    this.start();
  }

  reset() {
    this.snake = [[1, 1, 1], [1, 2, 1], [1, 3, 1]];
    this.target = [4, 4, 0];
    this.dir = 'U';
    this.alive = true;
  }

  /*
   * Transform to signal for Photon to process
   */

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

  /*
   * Helper
   */

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

  /*
   * Game Lifecycle
   */

  start() {
    bgm.addEventListener('ended', function() {
      this.currentTime = 0;
      this.play();
    }, false);
    bgm.play();

    this.spActive = true;

    let s = _.fill(Array(256), '0');

    // Set logo
    _.forEach(SNAKE_LOGO, (point) => {
      const seq = this.getSeq(point);
      s[seq] = '1';
    });
    this.sp.write(s.join('') + '\n');

    setTimeout(() => {
      this.reset();
      this.spActive = false;
    }, 3000);
  }

  dieAndRevive() {
    lose.play();

    if (this.difficulty != 'easy') {
      this.spActive = true;

      let s = _.fill(Array(256), '0');

      // Set sad face
      _.forEach(SAD_FACE, (point) => {
        const seq = this.getSeq(point);
        s[seq] = '2';
      });
      this.sp.write(s.join('') + '\n');

      setTimeout(() => {
        this.reset();
        this.spActive = false;
      }, 1500);
    }
  }

  win() {
    win.play();

    this.spActive = true;
    let s = _.fill(Array(256), '0');

    // Set happy face
    _.forEach(HAPPY_FACE, (point) => {
      const seq = this.getSeq(point);
      s[seq] = '3';
    });
    this.sp.write(s.join('') + '\n');

    setTimeout(() => {
      this.reset();
      this.spActive = false;
    }, 1500);

  }

  /*
   * Next game state
   */

  next() {
    const [tailX, tailY, tailZ] = _.first(this.snake);
    const [headX, headY, headZ] = _.last(this.snake);

    const nextSnake = _.drop(_.cloneDeep(this.snake));

    // Early return if dead
    if (this.dir == 'U' && headY == 7 || this.dir == 'D' && headY == 0 ||
        this.dir == 'L' && headX == 0 || this.dir == 'R' && headX == 7 ||
        this.dir == 'F' && headZ == 3 || this.dir == 'B' && headZ == 0) {
      if (this.difficulty != 'easy') {
        this.alive = false;
        this.dieAndRevive();
      }
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
      if (this.difficulty != 'easy') {
        this.alive = false;
        this.dieAndRevive();
      }
      return;
    }

    // If capturing the target, generate a new target
    if (this.isEqualPoints(nextPoint, this.target)) {
      bite.play();
      
      this.randomTarget();
      this.snake.push(nextPoint);
      // If the length is 8, we win!
      if (this.snake.length == 8) {
        this.win();
      } else if (this.snake.length == 5 && this.difficulty != 'easy') {
        this.win();
      }
    } else {
      nextSnake.push(nextPoint);
      this.snake = nextSnake;
    }
  }

  /*
   * SerialPort data methods
   */
  onData(data) {
    const [hor, ver, spa] = data.toString().split(',');

    let nextDir = this.dir;

    if (Math.abs(hor - CTL_MID) > Math.abs(ver - CTL_MID)) {
      if (hor > CTL_UPPER) {
        nextDir = 'L';
      } else if (hor < CTL_LOWER) {
        nextDir = 'R';
      }
    } else {
      if (ver > CTL_UPPER) {
        nextDir = 'F';
      } else if (ver < CTL_LOWER) {
        nextDir = 'B';
      }
    }

    if (spa > CTL_UPPER) {
      nextDir = 'U';
    } else if (spa < CTL_LOWER) {
      nextDir = 'D';
    }

    if (_.includes(['UD', 'DU', 'LR', 'RL', 'FB', 'BF'], this.dir + nextDir)) {
      return;
    }
    this.dir = nextDir;
    console.log('Dir: ', this.dir);
  }

  sendData() {
    if (!this.spActive) {
      const { FREQ, STEP_MS } = this.settings;
      if (this.sendCount * FREQ % STEP_MS == 0) {
        this.next();
        this.print();
        if (!this.spActive) {
          this.sp.write(this.toSignal());
        }
      }
      this.sendCount++;
    }
  }

  toggleData() {
    this.spActive = true;

    let s = _.fill(Array(256), '0');
    let s1 = _.fill(Array(256), '0');
    let s2 = _.fill(Array(256), '0');
    let s3 = _.fill(Array(256), '0');

    _.forEach(SNAKE_LOGO, (point) => {
      const seq = this.getSeq(point);
      s[seq] = '1';
    });
    _.forEach(SNAKE_LOGO, (point) => {
      const seq = this.getSeq([point[0], point[1], point[2] + 1]);
      s1[seq] = '2';
    });
    _.forEach(SNAKE_LOGO, (point) => {
      const seq = this.getSeq([point[0], point[1], point[2] + 2]);
      s2[seq] = '3';
    });
    _.forEach(SNAKE_LOGO, (point) => {
      const seq = this.getSeq([point[0], point[1], point[2] + 3]);
      s3[seq] = '4';
    });

    this.sp.write(s.join('') + '\n');
    setTimeout(() => {
      this.reset();
      this.spActive = false;
      this.sp.write(s1.join('') + '\n');
    }, 1000);

    setTimeout(() => {
      this.reset();
      this.spActive = false;
      this.sp.write(s2.join('') + '\n');
    }, 2000);

    setTimeout(() => {
      this.reset();
      this.spActive = false;
      this.sp.write(s3.join('') + '\n');
    }, 3000);

    setTimeout(() => {
      this.reset();
      this.spActive = false;

      if (this.sendDataInterval) {
        clearInterval(this.sendDataInterval);
        this.sendDataInterval = null;
      } else {
        this.sendDataInterval = setInterval(this.sendData.bind(this), this.settings.FREQ);
      }
    }, 4000);

  }
}

module.exports = SnakeGame;
