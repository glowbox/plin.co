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

    this.context.fillStyle = 'rgba(0, 0, 0, .1)';
    this.context.fillRect(0, 0, this.board.width, this.board.height);
    for (var i = 0; i < this.strums.length; i++) {
      this.drawLines(this.strums[i]);
      this.strums[i].tick += (this.strums[i].speed / 10) * deltaTime;
    }
    // this.drawLines(20, hexToRgb(colors[1]), 48928);
    // this.drawLines(20, hexToRgb(colors[2]), 38928);
    // this.drawLines(20, hexToRgb(colors[3]), 38928);
    // this.drawLines(20, hexToRgb(colors[4]), 38928);
    // this.drawLines(20, hexToRgb(colors[5]), 38928);
    // this.drawLines(100, hexToRgb(colors[7]), 12930);
  }

  this.hit = function(runCurr, index) {
    var coor = this.board.getPinCoordinates(index);
    this.strums.push({
      'num': this.strums.length ? 1 : 30,
      'color': hexToRgb(this.colorValues[Math.floor(this.colorValues.length * Math.random())]),
      'offset': 0, //Math.floor(Math.random() * 100000),
      'direction': Math.random() < .5 ? 1 : 0,
      'coor': coor,
      'tick': 0,
      'speed': Math.random() * .2 + .2
    })
  }

  this.drawLines = function(params) {
    var cx = this.board.width / 2;
    var cy = this.board.height / 2;
    for (var i = 0; i < params.num; i++) {
      var b = params.tick + params.offset;
      var a=((Math.sin(b*0.1+i*0.04)+1)*127.5)
      
      this.context.lineWidth = .1;
      this.context.strokeStyle = 'rgba(' + params.color.r + ', ' + params.color.g + ', ' + params.color.b + ', ' + Math.floor(a) + ')';
      this.context.beginPath();

      var x=(Math.sin(i*0.01+b*0.02)*Math.sin(i*0.003+b*0.004)*this.board.width);
      this.context.moveTo(cx+x,0);
      this.context.lineTo(cx+x,this.board.height);
      this.context.moveTo(cx-x,0);
      this.context.lineTo(cx-x,this.board.height);

      // var x=(Math.sin(i*0.01+b*0.02)*Math.sin(i*0.003+b*0.004)*this.board.width);
      // this.context.moveTo(params.coor.x+x,0);
      // this.context.lineTo(params.coor.x+x,this.board.height);
      // this.context.moveTo(params.coor.x-x,0);
      // this.context.lineTo(params.coor.x-x,this.board.height);

      // var y=(Math.sin(i*0.01+b*0.02)*Math.sin(i*0.003+b*0.004)*this.board.height);
      // this.context.moveTo(0, params.coor.y+y);
      // this.context.lineTo(this.board.width, params.coor.y+y);
      // this.context.moveTo(0, params.coor.y-y);
      // this.context.lineTo(this.board.width, params.coor.y-y);

      this.context.stroke();
    }
  }

  this.init();
}
