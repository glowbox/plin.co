
function VoronoiViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 8000;
  this.framesPerSecond = 5;

  this.lastHit = {x: -1, y: -1};
  this.isFirst = true;

  this.voronoiData = null;

  this.points = [];
  this.centers = [];
  this.velocity = [];
  this.fillColors = [];

  this.voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [board.boardWidth, board.boardHeight]]);

  this.colors = [];
  


  var scheme = new ColorScheme;
  scheme.from_hue(Math.floor(Math.random() * 360))
    .scheme('triade')
    .distance(0.1)
    .add_complement(false)
    .variation('hard')
    .web_safe(false);
  var colorValues = scheme.colors();
  
  for (var i = 0; i < colorValues.length; i++) {
    var rgb = hexToRgb(colorValues[i]);
    this.colors.push([ rgb.r, rgb.g, rgb.b ]);
  }
  
  for(var i = 0; i < board.pegs.length; i++){
    var coords = board.getPinCoordinates(i);
    this.points.push( [coords.x, coords.y] );
    this.centers.push( [coords.x, coords.y] );
    this.velocity.push( [0,0] );
    this.fillColors.push( [0,0,0] );
  }
  // this.lastHit = {x:this.points[0][0], y:this.points[0][1]}

  canvas.className = '';

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);

    if (this.lastHit.x == -1 && this.lastHit.y == -1) {
      this.lastHit = {x:coor.x, y:coor.y}
    }
    var deltaX = (coor.x - this.lastHit.x);
    var deltaY = (coor.y - this.lastHit.y);

    var count = Math.random() * 10 + 8;
    for(var i = 0; i < count; i++){ 
      var x = (Math.random() * deltaX) + this.lastHit.x + (Math.random() * 10 - 5);
      var y = (Math.random() * deltaY) + this.lastHit.y + (Math.random() * 10 - 5);
      this.points.push([x,y]);
      this.velocity.push([(Math.random() - 0.5)*2, (Math.random() * 0.5)*2]);
      this.centers.push([x,y]);
      var dist = distanceTo(x,y,coor.x,coor.y);
      var index = Math.floor(dist * 0.1);
      index = Math.max(0, Math.min(index, this.colors.length-1));
      this.fillColors.push( this.colors[index] );
    }
    this.updateVoronoi();

    this.lastHit.x = coor.x;
    this.lastHit.y = coor.y;

  },

  this.updateVoronoi = function() {
    
    for(var i = 0; i < this.velocity.length; i++){
      this.velocity[i][0] *= 0.95;
      this.velocity[i][1] *= 0.95;
      this.points[i][0] += this.velocity[i][0];
      this.points[i][1] += this.velocity[i][1];
    }
    this.voronoiData = this.voronoi(this.points);
  }

  this.render = function() {
    this.updateVoronoi();
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (var k = 0, l = this.colors.length; k < l; ++k) {
      context.fillStyle = this.colors[k];
      for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
        if (i % l === k && draw(this.voronoiData[i])) {
          var refreshStyle = false;
          if (i < this.board.numPegs) {
            //context.globalAlpha = 1;
            context.fillStyle = 'black';
            refreshStyle = true;
          } else {
            var fade = 1 - (distanceTo(this.points[i][0], this.points[i][1], this.centers[i][0], this.centers[i][1]) * 0.035);
            fade = Math.min(1,Math.max(0,fade));
            //console.log(fade);
            context.fillStyle = "rgba(" + this.fillColors[i][0] + ", " + this.fillColors[i][1] + ", " + this.fillColors[i][2] + ", " + fade + ")";
          }
          context.fill();
          if (refreshStyle) {

          //  context.fillStyle = this.colors[k];
          }
        }
      }

    }

    
    for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
      if(i < this.board.numPegs){
        context.strokeStyle = "rgba(255,255,255,0.15)";
      } else {
        var fade = 1 - (distanceTo(this.points[i][0], this.points[i][1], this.centers[i][0], this.centers[i][1]) * 0.01);
        fade = Math.max(fade, 0.35);
        context.strokeStyle = "rgba(255,255,255, " + fade + ")";
      }
      if (draw(this.voronoiData[i])) context.stroke();
    }
  }

  this.destroy = function() {
    this.voronoiData = [];
  }

  function draw(cell) {
    if (cell) {
      context.beginPath();
      context.moveTo(cell[0][0], cell[0][1]);
      for (var j = 1, m = cell.length; j < m; ++j) {
        context.lineTo(cell[j][0], cell[j][1]);
      }
      context.closePath();
      return true;
    }
  }

  this.updateVoronoi();
}