
function AttractMode(board, puckID) {
  
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 8000;
  this.framesPerSecond = 5;

  this.colors = [];

  this.pegRanges = [];
  
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

  this.particles = [];

  for(var i = 0; i < 30; i++) {
    this.particles.push({
      x : Math.random() * board.width,
      y : Math.random() * board.height,
      vx : -10,
      vy : 0,
      color : this.colors[Math.floor(Math.random() * colorValues.length)],
      lineWidth : Math.random() * 0.15 + 0.35
    })
  }


  for(var i = 0; i < board.pegs.length; i++){
    this.pegRanges.push( Math.random() * 8 + 3 );
  }

  this.hit = function(runCurr, index) {
  },

  this.render = function(context) {

    context.fillStyle = "rgba(0,0,0,0.1)";
    context.fillRect(0, 0, board.width, board.height);
    context.strokeStyle = "rgba(255,255,255,1)";
    
    for(var i = 0; i < this.particles.length; i++) {
      this.particles[i].x += this.particles[i].vx;
      this.particles[i].y += this.particles[i].vy;


      if(this.particles[i].y > board.height + 5){
        this.particles[i].x = Math.random() * board.width;
        this.particles[i].y = board.height + 5;
        this.particles[i].vx = 0;
        this.particles[i].vy = Math.random() * -1.5 - 1;
        this.particles[i].color = this.colors[Math.floor(Math.random() * colorValues.length)];
      }

      var tmp = new THREE.Vector2();
      for(var p = 0; p < board.pegs.length; p++){
        var range = this.pegRanges[p];
        var d = distanceTo(board.pegs[p].x, board.pegs[p].y, this.particles[i].x, this.particles[i].y);

        if(d < range) {
          
          var influence = 1 - (d / range);
          
          tmp.set(board.pegs[p].x - this.particles[i].x, board.pegs[p].x - this.particles[i].y);
          tmp.normalize();
          tmp.multiplyScalar(influence * 0.01);

          this.particles[i].vx += tmp.x;
          this.particles[i].vy += (tmp.y * 0.1);
          
          context.beginPath();
          context.lineWidth = this.particles[i].lineWidth * influence + 0.01;
          context.strokeStyle = "rgba(" + this.particles[i].color.join(",") + ", " + (influence) * 0.75 + ")";
          context.moveTo(this.particles[i].x, this.particles[i].y);
          context.lineTo(board.pegs[p].x, board.pegs[p].y);
          context.stroke();
          context.closePath();
        }
        
        
      }

      this.particles[i].vy += 0.0075; // gravity.

      this.particles[i].vx *= 0.98;
      this.particles[i].vy *= 0.97;
    }
  }


  this.destroy = function() {
  }
}