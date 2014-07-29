
function VoronoiViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;
  this.runningNum = puckID;

  this.gifLength = 5000;
  this.framesPerSecond = 5;

  this.lastHit = {x: 0, y: 0};
  this.isFirst = true;

  this.voronoiData = null;
  this.points = [];
  this.centers = [];
  this.velocity = [];

  this.voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [1500, 1500]]);

  this.colors = [];

  this.color = {
    r: Math.floor((puckID * 14.55) % 255),
    g: Math.floor((puckID * 13.66) % 255),
    b: Math.floor((puckID * 17.34) % 255)
  }

  for (var i = 0; i < 9; i++) {
    this.colors.push([ this.color.r , this.color.g , this.color.b ]);
    this.color = {
      r: Math.floor((this.color.r * 14.55) % 255),
      g: Math.floor((this.color.g * 13.66) % 255),
      b: Math.floor((this.color.b * 17.34) % 255)
    }
  }
  
  for(var i = 0; i < board.pegs.length; i++){
    var coords = board.getPinCoordinates(i);
    this.points.push( [coords.x, coords.y] );
    this.centers.push( [coords.x, coords.y] );
    this.velocity.push( [0,0] );
  }
  this.lastHit = {x:this.points[0][0], y:this.points[0][1]}

  canvas.className = '';

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);

    var deltaX = (coor.x - this.lastHit.x);
    var deltaY = (coor.y - this.lastHit.y);

    for(var i = 0; i < this.runningNum % 5 + 8; i++){ 
      var x = (((this.runningNum * 14.434) % 1) * deltaX) + this.lastHit.x + (((this.runningNum * 13.341) % 1) * 20 - 10);
      var y = (((this.runningNum * 18.822) % 1) * deltaY) + this.lastHit.y + (((this.runningNum * 12.645) % 1) * 20 - 10);
      this.runningNum = this.runningNum * 1.0327;
      this.points.push([x,y]);
      this.velocity.push([(Math.random() - 0.5)*2, (Math.random() * 0.5)*2]);
      this.centers.push([x,y]);
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
            context.globalAlpha = 1;
            context.fillStyle = 'black';
            refreshStyle = true;
          } else {
            var fade = 1 - (distanceTo(this.points[i][0], this.points[i][1], this.centers[i][0], this.centers[i][1]) * 0.05);
            context.fillStyle = "rgba(" + this.colors[k][0] + ", " + this.colors[k][1] + ", " + this.colors[k][2] + ", " + fade + ")";
           // context.globalAlpha = ;
          }
          context.fill();
          if (refreshStyle) {

            context.fillStyle = this.colors[k];
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