function RibbonsViz(board, puckID) {

  this.board = board;
  this.puckID = puckID;

  this.curves = 6;
  this.points = [];
  this.delay = 20;


  this.lCol = "#ff0000";
  this.dCol = "#00ff00";
  this.colorValues;
  
  this.hits = [
    [.1, .1],
    [.2, .2],
    [.3, .3],
    [.4, .4],
    [.5, .5],
    [.6, .6],
  ];

  this.init = function() {
    var scheme = new ColorScheme;
    scheme.from_hue(Math.floor(Math.random() * 360))
      .scheme('analogic')
      .distance(0.1)
      .add_complement(true)
      .variation('soft')
      .web_safe(false);
    this.colorValues = scheme.colors();
  }

  this.destroy = function() {

  }

  this.hit = function(pegIndex) {
    var coor = this.board.getPinCoordinates(pegIndex);
    for(var i = 0; i < 4; i++) {
      this.points.push({x:coor.x, y:coor.y, vx:Math.random() * .04 - .02, vy:Math.random() * .04 - .02,
        color: this.colorValues[Math.floor(this.colorValues.length * Math.random())]});
      this.points.push({x:coor.x, y:coor.y, vx:Math.random() * .04 - .02, vy:Math.random() * .04 - .02,
        color: this.colorValues[Math.floor(this.colorValues.length * Math.random())]});
    }
  }

  this.render = function(context) {
    context.lineWidth = .01;
    for(var j = 0; j < this.points.length; j++) {
        context.beginPath();
        if (this.points[j * 4]) {
          context.moveTo(this.points[j * 4].x, this.points[j * 4].y);
          context.bezierCurveTo(this.points[j * 4 + 1].x, this.points[j * 4 + 1].y,
                                this.points[j * 4 + 2].x, this.points[j * 4 + 2].y,
                                this.points[j * 4 + 3].x, this.points[j * 4 + 3].y);
          var color = hexToRgb(this.points[j * 4].color);
          context.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ', .3)';
          context.stroke();
        }
    }

    for(var i = 0; i < this.points.length; i++) {
        this.points[i].y += this.points[i].vx;
        this.points[i].x += this.points[i].vy;
    }
  }

  this.init();


}