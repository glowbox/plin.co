function WarpParticle(viz, field, x, y) {
  this.field = field;
  this.l = vec4.get(x, y);
  this.p = vec4.get(x, y);
  this.v = vec4.get();
  this.viz = viz;
  this.point = this.viz.points[Math.floor(Math.random() * this.viz.points.length)];
}

WarpParticle.prototype.reset = function(x, y) {
  if(x == null || y == null) if(Math.random() < 0.5) {
    x = this.field.viz.board.width  * (Math.random());
    y = this.field.viz.board.height * (Math.random() + 0.5 | 0);
  } else {
    x = this.field.viz.board.width  * (Math.random() + 0.5 | 0);
    y = this.field.viz.board.height * (Math.random());
  }
  // x = 10;
  // y = 10;

  vec4.set(this.l, x, y);
  vec4.set(this.p, x, y);
  vec4.set(this.v);
};

WarpParticle.prototype.outOfBounds = function() {
  return this.p[0] < 0 || this.p[0] > this.field.viz.board.width
      || this.p[1] < 0 || this.p[1] > this.field.viz.board.height;
};
            

WarpParticle.prototype.update = function(trace) {
  if(this.outOfBounds()) return;

  var x = 0.0050 * this.p[0];
  var y = 0.0050 * this.p[1];
  var z = 0.01 * this.field.now;
  
  var r = .05 * 0.05;
  var t = .05 * Math.PI * 2;

  vec4.set(vec4.buffer,
    r * Math.sin(t) + this.field.simplex.noise3D(x, y, +z),
    r * Math.cos(t) + this.field.simplex.noise3D(x, y, -z)
  );
  vec4.add(this.v, vec4.buffer, this.v);

    vec4.set(vec4.buffer, this.point[0], this.point[1]);
    vec4.sub(vec4.buffer, this.p, vec4.buffer);
    vec4.mul(vec4.buffer, 0.0010, vec4.buffer);
    vec4.add(this.v, vec4.buffer, this.v);

  
  vec4.mul(this.v, 0.990, this.v);
  vec4.set(this.l, this.p, this.l);
  vec4.add(this.p, this.v, this.p);

  return true;
};

function WarpField(container, viz) {
  this.simplex   = new SimplexNoise();
  this.viz = viz;
  this.particles = [];
}

WarpField.prototype.spawn = function() {
  for(var i = 1e2 - this.particles.length; i--;)
    this.particles.push(new WarpParticle(this.viz, this));
};

WarpField.prototype.clear = function() {
  // this.context.fillStyle = 'rgba(1, 1, 1, 1)';
  // this.context.fillRect(0, 0, this.width, this.height);
};

WarpField.prototype.render = function() {
  this.context.beginPath();

  var p = this.particles[0];
  p.update(true);

  for(var p, i = 0; p = this.particles[i++];) if(p.update()) {
    this.context.moveTo(p.l[0], p.l[1]);
    this.context.lineTo(p.p[0], p.p[1]);
  } else p.reset(); // this.particles.splice(--i, 1);

  this.context.lineWidth = 3;
  this.context.globalCompositeOperation = 'lighter';
  this.context.strokeStyle = 'rgba(255, 0, 0, 0.25)';
  this.context.stroke();

  this.context.globalCompositeOperation = 'source-over';
  this.context.fillStyle = 'rgba(0, 0, 0, 0.05)';
  this.context.fillRect(0, 0, this.viz.board.width, this.viz.board.height);
};

WarpField.prototype.update = function() {
  this.now = Date.now();
  this.spawn();
  this.render();
};

function WarpViz(board, puckID) {

  this.board = board;
  this.puckID = puckID;
  this.points;
  this.warpField;

  this.gifLength = 7000;
  this.framesPerSecond = 10;
  this.name = "warp";

  this.init = function() {
    this.points = [
      [.5, .5]
    ];
                
    for (var i = 0; i < this.points.length; i++) {
      this.points[i][0] = this.points[i][0];
      this.points[i][1] = this.points[i][1];
    }

    this.warpField = new WarpField(document.body, this);
  }

  this.destroy = function() {

  }

  this.hit = function(runCurr, index) {
    var coor = this.board.getPinCoordinates(index);
    
  }

  this.render = function(context) {
    this.warpField.context = context;
    this.warpField.update();
  }

  this.init();


}

/*

(function () {
              
              
  

  window.addEventListener('load', function () {
    
  }, false);
}).call(this);

*/