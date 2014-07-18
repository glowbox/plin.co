
function ParticleEsplode(board, puckID) {
  this.board = board;
  this.puckID = puckID;

  this.particleCount = 1000;
  this.particles = [];
  for(var i = 0; i < this.particleCount; i++){
    this.particles.push( {x:0, y:0, vx:0, vy:0, alive:false});
  }

  this.addParticles = function(x, y, runCurr) {
    var found = 0;
    for(var i = 0; i < this.particleCount; i++){
      if(!this.particles[i].alive) {
        var speed = Math.random() * 6;
        var angle = Math.random() * Math.PI * 2;

        found++;
        
        this.particles[i].alive = true;
        this.particles[i].x = x;
        this.particles[i].y = y;
        this.particles[i].life = Math.random() * 2 + 0.4;
        this.particles[i].vx = Math.cos(angle) * speed;
        this.particles[i].vy = Math.sin(angle) * speed;
        this.particles[i].fillStyle = 'rgb(' +
          Math.floor((this.puckID * (runCurr + 1) * 17)) % 255 + ',' +
          Math.floor((this.puckID * (runCurr + 1) * 25)) % 255 + ',' +
          Math.floor((this.puckID * (runCurr + 1) * 40)) % 255 + ')';

        if(found > 10){
          return;
        }
      }
    }
  }

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);
    this.addParticles(coor.x, coor.y, runCurr);
  },

  this.render = function() {
    
    context.clearRect( 0 , 0 , canvas.width, canvas.height );

    for(var i = 0; i < this.particleCount; i++) {

      if(this.particles[i].alive){
      
        this.particles[i].x += this.particles[i].vx;
        this.particles[i].y += this.particles[i].vy;
        this.particles[i].vy += 0.1;
        this.particles[i].life -= 0.025;
      
        if(this.particles[i].life <= 0) {
          this.particles[i].alive = false;
        } else {
          context.beginPath();
          context.fillStyle = this.particles[i].fillStyle;
          context.arc(this.particles[i].x, this.particles[i].y, this.particles[i].life * 10, 0, 2 * Math.PI, false);
          context.fill();
        }
      }
    }
  }
}