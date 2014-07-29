
function VoronoiViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 5000;
  this.framesPerSecond = 5;

  this.lastHit = {x: 0, y: 0};
  this.isFirst = true;

  this.voronoiData = null;
  this.points = [];
  this.voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [1500, 1500]]);

  this.colors = [];

  for (var i = 0; i < 9; i++) {
    this.colors.push('rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ' ,' + Math.floor(Math.random() * 255) + ' )');
  }
  
  for(var i = 0; i < board.pegs.length; i++){
    var coords = board.getPinCoordinates(i);
    this.points.push( [coords.x, coords.y] );
  }
  this.lastHit = {x:this.points[0][0], y:this.points[0][1]}

  canvas.className = '';

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);

    var deltaX = (coor.x - this.lastHit.x);
    var deltaY = (coor.y - this.lastHit.y); 

    for(var i = 0; i < Math.random() * 5 + 3; i++){ 
      var x = (Math.random() * deltaX) + this.lastHit.x + (Math.random() * 20 - 10);
      var y = (Math.random() * deltaY) + this.lastHit.y + (Math.random() * 20 - 10);
      this.points.push([x,y]);
    }
    this.updateVoronoi();

    this.lastHit.x = coor.x;
    this.lastHit.y = coor.y;

  },

  this.updateVoronoi = function() {
    this.voronoiData = this.voronoi(this.points);
  }

  this.render = function() {

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (var k = 0, l = this.colors.length; k < l; ++k) {
      context.fillStyle = this.colors[k];
      for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
        if (i % l === k && draw(this.voronoiData[i])) {
          var refreshStyle = false;
          if (i < this.board.numPegs) {
            context.fillStyle = 'black';
            refreshStyle = true;
          }
          context.fill();
          if (refreshStyle) {
            context.fillStyle = this.colors[k];
          }
        }
      }
    }

    context.strokeStyle = "white";
    for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
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