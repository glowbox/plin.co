function Vector(point, dir, depth, viz, color) {
  this.p0 = this.p1 = this.p2 = point;
  this.dx = dir[0];
  this.dy = dir[1];
  this.depth = depth;
  this.dead = viz.dead(this.p2, this.depth);
  this.next = null;
  this.prev = null;
  this.list = null;
  this.viz = viz;
  this.context;
  this.color = color;
  // console.log('--', this.viz);
}

Vector.prototype.step = function() {
  if (this.dead) { this.list.remove(this); return; }
  this.p1 = this.p2;
  this.p2 = this.viz.movepoint(this.p2, this.dx, this.dy);
  this.dead = this.viz.dead(this.p2, this.depth);
  if (!this.viz.setpixel(this.p2, this.color)) {
    this.dead = true;
    this.list.push(this.spawn());
  }
};

Vector.prototype.spawn = function() {
  return new Vector(this.viz.pickpoint(this.p0, this.p2),
                    this.viz.randdir(),
                    this.depth - 1, this.viz, this.color);
};

function List() {
  this.head = {next: null, prev: null};
  this.tail = {next: null, prev: null};
  this.tail.prev = this.head;
  this.head.next = this.tail;
  this.length = 0;
}

List.prototype.push = function(vec) {
  if (!vec.dead) {
    vec.prev = this.tail.prev;
    this.tail.prev = vec;
    vec.next = this.tail;
    vec.prev.next = vec;
    vec.list = this;
    this.length++;
  }
  return this;
};

List.prototype.remove = function(vec) {
  var prev = vec.prev, next = vec.next;
  prev.next = next;
  next.prev = prev;
  this.length--;
};

function CardinalViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.name = "cardinal";

  this.imagedata;
  this.pixelArray;
  this.vectors;

  this.spreadCanvas;
  this.spreadContext;
  this.colorValues;

  this.dir = {
    N: [0, -1],
    S: [0, 1],
    W: [-1, 0],
    E: [1, 0],
    NW: [-1, -1],
    NE: [1, -1],
    SW: [-1, 1],
    SE: [1, 1]
  };

  var ratio;

  this.init = function() {
    var self = this;
    this.vectors = new List();
    var numLines = 5;

    this.spreadCanvas = document.createElement('canvas');
    ratio = canvas.width / this.board.width;
    this.spreadCanvas.width = this.board.width * ratio;
    this.spreadCanvas.height = this.board.height * ratio;
    this.spreadContext = this.spreadCanvas.getContext('2d');

    var scheme = new ColorScheme;
    scheme.from_hue(Math.floor(Math.random() * 360))
      .scheme('contrast')
      .distance(0.1)
      .add_complement(true)
      .variation('hard')
      .web_safe(false);
    this.colorValues = scheme.colors();
  }

  this.destroy = function() {

  }

  this.render = function(context) {
    this.context = context;
    if (!this.imagedata) {
      this.spreadContext.clearRect(0, 0, this.spreadCanvas.width, this.spreadCanvas.height);
      this.imagedata = this.spreadContext.createImageData(this.spreadCanvas.width, this.spreadCanvas.height);
      this.pixelArray = this.imagedata.data;
    }
    if (!this.vectors.length) return;
    for (var v = this.vectors.head.next; v.next !== null; v = v.next) {
      v.step();
    }
    this.spreadContext.putImageData(this.imagedata, 0, 0);
    
  }

  this.setpixel = function(point, color) {
    var i = this.getx(point) * 4 + this.gety(point) * this.spreadCanvas.width * 4;
    if (this.pixelArray[i]) return false;
    this.pixelArray[i] = 255;
    this.pixelArray[i+1] = 255;
    this.pixelArray[i+2] = 255;
    this.pixelArray[i+3] = 0;
    this.context.fillStyle = 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
    this.context.fillRect(this.getx(point)/ratio, this.gety(point)/ratio, .1, .1);
    return true;
  }

  this.hit = function(pegIndex) {
    var coor = this.board.getPinCoordinates(pegIndex);

    for (var i = 0; i < 20; i++) {
      var colorHex = this.colorValues[Math.floor(Math.random() * this.colorValues.length)];

      this.vectors.push(new Vector(this.mkpoint(coor.x*ratio, coor.y*ratio),
                              this.randdir(),
                              20, this, hexToRgb(colorHex)));
    }
  }

  this.randint = function(n) { return Math.floor(Math.random()*n); }
  this.choose = function() { return arguments[this.randint(arguments.length)]; }

  this.randdir = function() {
    return this.choose(this.dir.N, this.dir.S, this.dir.E, this.dir.W,
                  this.dir.NW, this.dir.NE, this.dir.SW, this.dir.SE);
  }

  this.mkpoint = function(x, y) {
    return (x|0) | ((y|0) << 16);
  }

  this.clamp0 = function(n) { return n < 0 ? 0 : n }

  this.movepoint = function(p, dx, dy) {
    var x = this.clamp0(this.getx(p) + dx);
    var y = this.clamp0(this.gety(p) + dy);
    return this.mkpoint(x, y);
  }

  this.pickpoint = function(p1, p2) {
    var t = Math.random();
    var x1 = this.getx(p1), y1 = this.gety(p1);
    var x2 = this.getx(p2), y2 = this.gety(p2);
    return this.mkpoint(x1 + t * (x2 - x1),
                   y1 + t * (y2 - y2));
  }

  this.getx = function(point) { return point & 0xffff; }
  this.gety = function(point) { return point >> 16 }

  this.dead = function(p, depth) {
    var x = this.getx(p);
    var y = this.gety(p);
    return !depth || x <= 0 || x >= this.spreadCanvas.width || y <= 0 || y >= this.spreadCanvas.height; 
  }

  this.init();
}
/*













function Start() {
  
}

canvas.onclick = Start;

Start();

*/