// The snake game

class SnakeGame {
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

module.exports = SnakeGame;
