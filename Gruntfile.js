/*!
 *
 * plin.co config.
 *
 * Grunt Nautilus:
 * https://github.com/kitajchuk/grunt-nautilus
 *
 * Available grunt-nautilus tasks:
 * grunt nautilus:build [, flags...]
 * grunt nautilus:deploy [, flags...]
 * grunt nautilus:module [, flags...]
 *
 */
module.exports = function ( grunt ) {


    "use strict";


    // Default project paths.
    var pubRoot = "public",
        sassRoot = "public/sass",
        cssRoot = "public/css",
        fontsRoot = "public/fonts",
        imgRoot = "public/img",
        jsRoot = "public/js",
        appRoot = jsRoot + "/app",
        libRoot = jsRoot + "/lib",
        distRoot = jsRoot + "/dist";


    // Project configuration.
    grunt.initConfig({
        // Project meta.
        meta: {
            version: "0.1.0"
        },


        // Nautilus config. ( required options )
        nautilus: {
            options: {
                jsAppRoot: appRoot,
                jsDistRoot: distRoot,
                jsLibRoot: libRoot,
                jsRoot: jsRoot,
                pubRoot: pubRoot,
                compass: {
                    cssRoot: cssRoot,
                    sassRoot: sassRoot,
                    imgRoot: imgRoot,
                    fontsRoot: fontsRoot
                }
                
            }
        }

        /** Ender config. ( optional )
        // https://github.com/endium/grunt-ender
        ender: {
            options: {
                output: libRoot+"/ender/ender",
                dependencies: ["jeesh"]
            }
        }*/


    });


    // Load the nautilus plugin.
    grunt.loadNpmTasks( "grunt-nautilus" );


    // Register default task.
    grunt.registerTask( "default", ["nautilus:build"] );


};