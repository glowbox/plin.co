
function ParticleEsplode(board, puckID) {
  var self = this;
  this.board = board;
  this.puckID = puckID;

  this.gifLength = 4000;
  this.framesPerSecond = 5;

  this.particleCount = 3000;
  this.particles = [];
  for(var i = 0; i < this.particleCount; i++){
    this.particles.push( {x:0, y:0, vx:0, vy:0, alive:false});
  }

  this.world;
  this.hideGeometry = true;

  this.geometry = [];

  canvas.className = '';

  Physics.behavior('pin-constraints', function( parent ){
    return {
        init: function( opts ){
            parent.init.call( this, opts );
            this.pins = [];
        },
        
        add: function( body, targetPos ){
            this.pins.push({
                body: body,
                target: Physics.vector( targetPos )
            });
        },
        
        behave: function( data ){
            
            var pins = this.pins
                ,pin
                ;
            
            for (var i = 0, l = pins.length; i < l; i++){
                pin = pins[ i ];
                // move body to correct position
                pin.body.state.pos.clone( pin.target );
                // pin.body.state.angular.acc.pos = 0;
                // pin.body.state.angular.acc.acc = 0;
                // pin.body.state.angular.acc.vel = 0;
            }
        }
    };
});

Physics(function (world) {
    var renderer = Physics.renderer('canvas', {
        el: 'canvas',
        width: window.innerWidth,
        height: window.innerHeight
    });
    self.world = world;
    world.add(renderer);

    var pinConstraints = Physics.behavior('pin-constraints');
    self.baffle = [];
    for (var i = 0; i < board.numPegs; i++) {
      var coors = board.getPinCoordinates(i);
      var ball = Physics.body('circle', {
          x: coors.x,
          y: coors.y,
          radius: board.pegSpacing / 20,
          hidden: self.hideGeometry,
          restitution: 0.9,
      });
      self.geometry.push(ball);
      world.add(ball);
      pinConstraints.add(ball, ball.state.pos);

      // if (i < 7) {
      //   var baffle = Physics.body('rectangle', {
      //       x: coors.x,
      //       y: window.innerHeight - (board.pegSpacing * .8) / 2,
      //       width: board.pegSpacing / 6,
      //       height: (board.pegSpacing * .8),
      //       mass: 10000000000,
      //       styles: {
      //           fillStyle: '#999999',
      //           angleIndicator: 'none'
      //       },
      //       hidden: self.hideGeometry,
      //       fixed: true,
      //       cof: 0,
      //       restitution: .8

      //       // restitution: 0.9
      //   });
      //   self.geometry.push(baffle);
      //   world.add(baffle);
      //   self.baffle.push(baffle);
      //   pinConstraints.add(baffle, baffle.state.pos);
      // }

      if (i % 13 === 7) {
        for (var j = 0; j < 2; j++) {
          var xLoc = coors.x + board.pegSpacing * 6.25;
          var bumpAngle = Math.PI;
          if (j ==1) {
            xLoc = coors.x - board.pegSpacing - ((board.pegSpacing / 2) / 2);
            bumpAngle = 0;
          }
          var bumper = Physics.body('convex-polygon', {
            vertices: [
              {x: 0, y: 0},
              {x: (board.pegSpacing / 2), y: (board.pegSpacing) * .866666},
              {x: 0, y: board.pegSpacing * 2 * .866666}
            ],
            x: xLoc,
            y: coors.y,
            angle: bumpAngle,
            restitution: 0.9,
            hidden: self.hideGeometry,
            styles: {
                fillStyle: '#859900',
                angleIndicator: 'none'
            }
          });
          self.geometry.push(bumper);
          world.add(bumper);
          pinConstraints.add(bumper, bumper.state.pos);
        }
      }
    }

    world.add(Physics.integrator('verlet', {
        drag: 0.003
    }));
    
    world.add(pinConstraints);

    world.add(Physics.behavior('constant-acceleration'));
    world.add(Physics.behavior('body-collision-detection'));
    world.add(Physics.behavior('body-impulse-response'));
    world.add(Physics.behavior('sweep-prune'));

    var bounds = Physics.aabb(board.pegOffsetX - board.pegSpacing, 0, board.pegOffsetX + board.pegWidth + board.pegSpacing / 2, window.innerHeight);

    world.add(Physics.behavior('edge-collision-detection', {
        aabb: bounds,
        restitution: 0.01
    }));

    Physics.util.ticker.on(function (time, dt) {
        world.step(time);
    });

    world.render();

    Physics.util.ticker.start();

    world.on('step', function () {
        world.render();
    });

});








  this.addParticles = function(x, y, runCurr) {
    for(var i = 0; i < 3; i++){
      console.log(i);
        var circ = Physics.body('circle', {
            x: x - 5,
            y: y - 20,
            vy: -Math.random() * .1,
            vx: -.1 + Math.random() * .2,
            radius: (board.pegSpacing / 10) + Math.random() * (board.pegSpacing / 10),
            mass: .0000000001,
            styles: {
                fillStyle: 'rgb(' + Math.floor(Math.random() * 255) + ',' + Math.floor(Math.random() * 255) + ' ,' + Math.floor(Math.random() * 255) + ' )',
                angleIndicator: 'none'
            },
            restitution: .0

            // restitution: 0.9
        });
        self.geometry.push(circ);
        this.world.add(circ);
    }
  }

  this.hit = function(runCurr, index) {
    var coor = board.getPinCoordinates(index);
    this.addParticles(coor.x, coor.y, runCurr);
  },

  this.render = function() {

    // for(var i = 0; i < this.particleCount; i++) {

    //   if(this.particles[i].alive){
      
    //     this.particles[i].x += this.particles[i].vx;
    //     this.particles[i].y += this.particles[i].vy;
    //     this.particles[i].vy += 0.1;
    //     this.particles[i].life -= 0.025;
      
    //     if(this.particles[i].life <= 0) {
    //       this.particles[i].alive = false;
    //     } else {
    //       context.beginPath();
    //       context.fillStyle = this.particles[i].fillStyle;
    //       context.arc(this.particles[i].x, this.particles[i].y, this.particles[i].life * 10, 0, 2 * Math.PI, false);
    //       context.fill();
    //     }
    //   }
    // }
  }

  this.destroy = function() {
    for (var i = 0; i < this.geometry.length; i++) {
      this.world.remove(this.geometry[i]);
    }
    Physics.util.ticker.stop();
  }
}