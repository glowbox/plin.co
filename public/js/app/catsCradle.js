function CatsCradle(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 7000;
  this.framesPerSecond = 8;
  this.name = "catsCradle";

  this.radius;
  this.colorValues;
  this.points;
  
  this.init = function() {
    var scheme = new ColorScheme;
    scheme.from_hue(Math.floor(Math.random() * 360))
      .scheme('triade')
      .web_safe(false);
    this.colorValues = scheme.colors();

    this.points = [];
    for (var i = 0; i < 9; i++) {
      
    }
  }

  this.destroy = function() {

  }

  this.render = function(context, deltaTime) {
    this.context = context;
    this.context.lineWidth = .1;
    this.context.clearRect(0, 0, canvas.width, canvas.height);
    
    for (var i = 0; i < this.points.length; i++) {
      this.points[i].tick += .01 * this.points[i].speed;
    }

    for (var i = 0; i < this.points.length; i++) {
      this.drawLines(i, this.points[i]);
    }
  }

  this.hit = function(runCurr, index) {
    var coor = this.board.getPinCoordinates(index);
    
    this.points.push({
      x: coor.x,
      y: coor.y,
      tick: 0,
      speed: 2 + Math.random() * 5,
      radius: 1 + Math.random() * 2,
      colors: []}
    )
    for (var i = 0; i < 15; i++) {
      this.points[this.points.length - 1].colors.push('#' + this.colorValues[Math.floor(Math.random() * this.colorValues.length)]);
    }
    console.log(this.points);
  }

  this.drawLines = function(num, point) {
    // context.strokeStyle=this.points[num].color;
    // context.beginPath();
    // context.arc(this.points[num].x,this.points[num].y,this.points[num].radius,0,2*Math.PI);
    // context.stroke();
    // context.closePath();
    for (var i = 0; i < this.points.length; i++) {
      if (i !== num) {
        // this.context.strokeStyle = this.points[i].color;
        this.context.strokeStyle = this.points[num].colors[i];
        this.context.beginPath();
        this.context.moveTo(Math.sin(this.points[i].tick) * this.points[i].radius + this.points[i].x, Math.cos(this.points[i].tick) * this.points[i].radius + this.points[i].y)
        this.context.lineTo(
          Math.sin(this.points[num].tick) * this.points[num].radius + this.points[num].x, Math.cos(this.points[num].tick) * this.points[num].radius + this.points[num].y)
        this.context.closePath();
        this.context.stroke();
      }
    }
  }

  this.init();
}

/*

var canvas = document.createElement('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var context = canvas.getContext('2d');
context.strokeStyle = 'white';
context.lineWidth = 3;
var radius = 10;
context.globalCompositeOperation = 'color-dodge';

document.body.appendChild(canvas);

var this.points = [];

for (var i = 0; i < 9; i++) {
  this.points.push(
    {x: Math.random() * (400 - 50) + 25,
     y: Math.random() * (400 - 50) + 25,
     tick: 0,
     speed: .2 + Math.random() * .5,
     radius: 10 + Math.random() * 20,
     color: 'rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ')'}
  )
}


*/
