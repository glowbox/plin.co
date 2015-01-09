var visualizers = {
  'attract-mode' : {
    'name': 'Attract',
    'isAttract': true,
    'captureLength': 5000,
    'captureFPS': 1,
    'constructor': AttractMode,
    'autoClear':false
  },
  /*'birds' : {
    'name': 'Birds',
    'captureLength': 8000,
    'captureFPS': 5,
    'constructor': BirdsViz
  },*/
  'voronoi' : {
    'name' : 'Voronoi',
    'captureLength' : 8000,
    'captureFPS' : 5,
    'constructor': VoronoiViz,
    'autoClear':true
  },
  'particles' : {
    'name' : 'Particles',
    'captureLength' : 7000,
    'captureFPS' : 10,
    'constructor': ParticleEsplode,
    'autoClear':true
  },
  'cardinal' : {
    'name' : 'Cardinal',
    'captureLength' : 9000,
    'captureFPS' : 5,
    'constructor': CardinalViz,
    'autoClear':false
  },
  'ribbons' : {
    'name' : 'Ribbons',
    'captureLength' : 15000,
    'captureFPS' : 3,
    'constructor': RibbonsViz,
    'autoClear':false
  },
  'strum' : {
    'name' : 'Strum',
    'captureLength' : 7000,
    'captureFPS' : 8,
    'constructor': StrumViz,
    'autoClear':true
  },
  'catsCradle' : {
    'name' : 'Cat\'s Cradle',
    'captureLength' : 7000,
    'captureFPS' : 8,
    'constructor': CatsCradle,
    'autoClear':true
  }
};