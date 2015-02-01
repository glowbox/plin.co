
function VoronoiViz(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.name = "voronoi";

  this.lastHit = {x: -1, y: -1};
  this.isFirst = true;

  this.voronoiData = null;

  this.points = [];
  this.centers = [];
  this.velocity = [];
  this.fillColors = [];

  this.voronoi = d3.geom.voronoi()
    .clipExtent([[-10, -10], [board.width+10, board.height+10]]);

  this.colors = [];
  this.random = new Math.seedrandom(this.puckID);

  var scheme = new ColorScheme;
  scheme.from_hue(Math.floor(this.random() * 360))
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

  this.hit = function(pegId) {

    var coor = board.getPinCoordinates(pegId);

    if (this.lastHit.x == -1 && this.lastHit.y == -1) {
      this.lastHit = {x:coor.x, y:coor.y}
    }
    var deltaX = (coor.x - this.lastHit.x);
    var deltaY = (coor.y - this.lastHit.y);

    var count = this.random() * 10 + 8;
    var spawnRadius = 1;
    for(var i = 0; i < count; i++){ 
      
      var x = (this.random() * deltaX) + this.lastHit.x + (this.random() * spawnRadius - (spawnRadius/2));
      var y = (this.random() * deltaY) + this.lastHit.y + (this.random() * spawnRadius - (spawnRadius/2));
      
      this.points.push([x,y]);
      this.velocity.push([(this.random() - 0.5) * 0.2, (this.random() * 0.5) * 0.2]);
      this.centers.push([x,y]);
      var dist = distanceTo(x, y, coor.x, coor.y);
      var index = Math.floor(dist);
      
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


  this.render = function(context) {
    
    this.updateVoronoi();

    for (var k = 0, l = this.colors.length; k < l; ++k) {
      context.fillStyle = this.colors[k];
      for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
        if (i % l === k && draw(context, this.voronoiData[i])) {
          var refreshStyle = false;
          if (i < this.board.numPegs) {
            //context.globalAlpha = 1;
            context.fillStyle = 'black';
            refreshStyle = true;
          } else {
            var fade = 1 - (distanceTo(this.points[i][0], this.points[i][1], this.centers[i][0], this.centers[i][1]) * 0.35);
            fade = Math.min(1, Math.max(0, fade));
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

    
    /*
    // Draw peg-cells 
    for (var i = 0, n = this.voronoiData.length; i < n; ++i) {
      if(i < this.board.numPegs){
        context.lineWidth = 0.1;
        context.strokeStyle = "rgba(255,255,255,0.25)";
      } else {
        var fade = 1 - (distanceTo(this.points[i][0], this.points[i][1], this.centers[i][0], this.centers[i][1]) * 0.01);
        fade = Math.max(fade, 0.35);
        context.strokeStyle = "rgba(255,255,255, " + fade + ")";
      }
      if (draw(this.voronoiData[i])) context.stroke();
    }
    */
  }

  this.destroy = function() {
    this.voronoiData = [];
  }

  function draw(ctx, cell) {
    if (cell) {
      ctx.beginPath();
      ctx.moveTo(cell[0][0], cell[0][1]);
      for (var j = 1, m = cell.length; j < m; ++j) {
        ctx.lineTo(cell[j][0], cell[j][1]);
      }
      ctx.closePath();
      return true;
    }
  }

  this.updateVoronoi();
}