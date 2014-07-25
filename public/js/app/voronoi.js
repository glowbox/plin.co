
function VoronoiViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 3000;
  this.framesPerSecond = 15;

  this.lastHit = {x: 0, y: 0};
  this.isFirst = true;

  this.voronoiData = null;
  this.points = [];
  this.voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [1500, 1500]]);
  
  for(var i = 0; i < board.pegs.length; i++){
    var coords = board.getPinCoordinates(i);
    this.points.push( [coords.x, coords.y] );
  }

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);

    var deltaX = (coor.x - this.lastHit.x);
    var deltaY = (coor.y - this.lastHit.y); 

    for(var i = 0; i < 10; i++){ 

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
    
    context.clearRect( 0 , 0 , canvas.width, canvas.height );
    var v;
    for(var i = 0; i < this.voronoiData.length; i++){
      v = this.voronoiData[i];
      context.beginPath();
      
      if(v.length > 0){
        context.moveTo(v[v.length-1][0], v[v.length-1][1]);

        for(var p = 0; p < v.length; p++){
          context.lineTo(v[p][0], v[p][1]);
        }
        context.fill();
      }
    }
  }

  this.updateVoronoi();
}