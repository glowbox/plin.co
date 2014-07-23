
function ParticleEsplode(board, puckID) {
  var self = this;
  this.board = board;
  this.puckID = puckID;

  this.particleCount = 1000;
  this.particles = [];
  for(var i = 0; i < this.particleCount; i++){
    this.particles.push( {x:0, y:0, vx:0, vy:0, alive:false});
  }
  this.color = {
    r: Math.floor((puckID * 14.55) % 255),
    g: Math.floor((puckID * 13.66) % 255),
    b: Math.floor((puckID * 17.34) % 255)
  }

  this.world;

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

    for (var i = 0; i < board.numPegs; i++) {
      var coors = board.getPinCoordinates(i);
      var ball = Physics.body('circle', {
          x: coors.x,
          y: coors.y,
          radius: 5,
          // hidden: true,
          restitution: 0.9
      });
      world.add(ball);
      pinConstraints.add(ball, ball.state.pos);

      if (i < 7) {
        console.log(100 * i);
        var baffle = Physics.body('rectangle', {
            x: coors.x,
            y: window.innerHeight - 50,
            width: 15,
            height: 100,
            mass: 1,
            styles: {
                fillStyle: '#999999',
                angleIndicator: 'none'
            },
            restitution: 1

            // restitution: 0.9
        });
        world.add(baffle);
        // pinConstraints.add(baffle, baffle.state.pos);
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

    var bounds = Physics.aabb(board.pegOffsetX - board.pegSpacing/2, 0, board.pegOffsetX + board.pegWidth, window.innerHeight);

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
    var found = 0;
    for(var i = 0; i < 3; i++){
      if(!this.particles[i].alive) {
        var speed = (this.color.r * 17.93) % 1 * 6;
        var angle = (this.color.g * 16.13) % 1 * Math.PI * 2;

        found++;
        var circ = Physics.body('circle', {
            x: x - 5,
            y: y - 20,
            vy: -(this.color.b * 14.65) % 1 * .1,
            vx: -.5 + (this.color.r * 12.39) % 1,
            radius: 10 + (this.color.g * 16.43) % 1 * 10,
            mass: .0001,
            styles: {
                fillStyle: 'rgb(' + this.color.r + ',' + this.color.g + ' ,' + this.color.b + ' )',
                angleIndicator: 'none'
            }

            // restitution: 0.9
        });
        this.world.add(circ);

        this.color = {
          r: Math.floor((this.color.r * 14.55) % 255),
          g: Math.floor((this.color.g * 13.66) % 255),
          b: Math.floor((this.color.b * 17.34) % 255)
        }

        if(found >= 2){
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
    
    // context.fillStyle = 'black';
    // context.fillRect(0, 0, canvas.width, canvas.height);

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
}