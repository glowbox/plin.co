function StrumViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 7000;
  this.framesPerSecond = 8;
  this.name = "strum";

  this.strums = [];
  this.tick;

  this.colorValues;
  this.init = function() {
    var self = this;
    this.tick = 0;

    var scheme = new ColorScheme;
    scheme.from_hue(Math.floor(Math.random() * 360))
      .scheme('triade')
      .web_safe(false);
    this.colorValues = scheme.colors();
  }

  this.destroy = function() {

  }

  this.render = function(context, deltaTime) {
    this.context = context;
   
    this.context.clearRect(0, 0, canvas.width, canvas.height);
    // this.context.fillText(~~delay +'ms / ' +  (1000/ delay | 0) + 'fps', 50, 50);
    this.context.strokeStyle="white";
    this.context.lineWidth = .1;

    var cx = this.board.width / 2;
    var cy = this.board.height / 2;
    var h = this.board.height;
    for (var i = 0; i < this.strums.length; i++) {
      // this.drawLines(this.strums[i]);
      this.strums[i].tick += (this.strums[i].speed / 10) * deltaTime;
      for (var j = 0; j < this.strums[i].num; j++) {
        var b = this.strums[i].tick + this.strums[i].offset;
        var a=((Math.sin(b*0.1+i*0.04)+1)*127.5)
        this.context.strokeStyle = 'rgba(' + this.strums[i].color.r + ', ' + this.strums[i].color.g + ', ' + this.strums[i].color.b + ', ' + 1 + ')';

        var x=(Math.sin(j*0.01+b*0.02)*Math.sin(j*0.003+b*0.004)*this.board.width);
        var y=(Math.sin(i*0.01+b*0.02)*Math.sin(i*0.003+b*0.004)*this.board.height);
        this.context.beginPath();
        this.context.moveTo(cx+x,0);
        this.context.lineTo(cx+x,h);
        this.context.stroke();
        this.context.beginPath();
        this.context.moveTo(cx-x,0);
        this.context.lineTo(cx-x,h);
        this.context.stroke();

        // this.context.beginPath();
        // this.context.moveTo(this.strums[i].coor.x+x,0);
        // this.context.lineTo(this.strums[i].coor.x+x,this.board.height);
        // this.context.stroke();
        // this.context.beginPath();
        // this.context.moveTo(this.strums[i].coor.x-x,0);
        // this.context.lineTo(this.strums[i].coor.x-x,this.board.height);
        // this.context.stroke();

        // this.context.beginPath();
        // this.context.moveTo(0, this.strums[i].coor.y+y);
        // this.context.lineTo(this.board.width, this.strums[i].coor.y+y);
        // this.context.stroke();
        // this.context.beginPath();
        // this.context.moveTo(0, this.strums[i].coor.y-y);
        // this.context.lineTo(this.board.width, this.strums[i].coor.y-y);
        // this.context.stroke();
        

      }
    }
  }

  this.hit = function(runCurr, index) {
    var coor = this.board.getPinCoordinates(index);
    this.strums.push({
      'num': this.strums.length ? 10 : 300,
      'color': hexToRgb(this.colorValues[Math.floor(this.colorValues.length * Math.random())]),
      'offset': 0, //Math.floor(Math.random() * 100000),
      'direction': Math.random() < .5 ? 1 : 0,
      'coor': coor,
      'tick': 0,
      'speed': Math.random() * .2 + .2
    })
  }

  this.init();
}
