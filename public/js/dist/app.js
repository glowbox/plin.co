/*!
 * 
 * grunt-nautilus
 * https://github.com/kitajchuk/grunt-nautilus
 *
 * Copyright (c) 2013 Brandon Kitajchuk
 * Licensed under the MIT license.
 *
 *
 */
(function ( window, undefined ) {


var app,
    
    // Keep track of controller modules
    controllers = [],
    
    // Keep track of executed modules
    executed = {},
    
    // Handle console fallback
    console = (window.console || {
        log: function () {}
    });


/**
 *
 * App {object}
 * @namespace app
 * @memberof! <global>
 *
 */
app = {};


/**
 *
 * Environment setting
 * @member env
 * @memberof app
 *
 */ 
app.env = "development";


/**
 *
 * Console.log polyfill
 * @method log
 * @memberof app
 *
 */
app.log = function () {
    var args = [].slice.call( arguments, 0 );
    
    if ( !/^dev/.test( app.env ) ) {
        return;
    }
    
    if ( !args.length ) {
        args.push( app );
        
    } else {
        args.unshift( "[App]:" );
    }
    
    // IE8 Doesn't support .call/.apply on console.log
    if ( console.log.apply ) {
        console.log.apply( console, args );
    }
};


/**
 *
 * Controller executor
 * @method exec
 * @param {string} module The name of the module controller to execute
 * @memberof app
 * @example app.exec( "foo" )
 *
 */
app.exec = function ( module ) {
    var moduleName = module;
    
    if ( app.controllers && app.controllers[ module ] ) {
        module = app.controllers[ module ];
        
    } else {
        module = undefined;
    }
    
    if ( executed[ moduleName ] ) {
            app.log( "Module " + moduleName + " already executed! Backing out..." );
            
    } else if ( module && (typeof module.init === "function") ) {
        module.init();
        
        executed[ moduleName ] = true;
    }
    
    return module;
};


/**
 *
 * Expose app to global scope
 *
 */
window.app = app;


})( window );
(function ( window, document, undefined ) {
  "use strict";
  /*!
   *
   * Welcome to grunt-nautilus
   * https://github.com/kitajchuk/grunt-nautilus
   *
   * Copyright (c) 2013 Brandon Kitajchuk
   * Licensed under the MIT license.
   *
   *
   * Application Layout:
   * -----------------------------------------------------------------
   * Keep all your application files in the app dir of your js root.
   *      @example: static/js/app/yourmodules...
   *
   * Keep all your third party files in the lib dir of your js root.
   *      @example: static/js/lib/theirmodules...
   *
   *
   * Using Controllers:
   * -----------------------------------------------------------------
   * Controllers are how scripts are compiled and built,
   * that is to say they are the "target" files or starting points
   * for your application to build from. Controllers build into their
   * own dist js and can be included as such on your web pages.
   *      - @example: static/js/app/controllers/foo.js
   *      - This will compile to static/js/dist/foo.js
   *      - The compiled script will include all dependencies.
   *
   * Controllers assume an init method that can be called via app.exec().
   * A basic contoller template looks like this:
   * var fooController = {
   *       init: function () {
   *       
   *       }
   * };
   *
   * export { fooController };
   *
   * In the compiled build this script will execute:
   * app.exec( "fooController" );
   *
   *
   * Using the ES6 syntax for modules:
   * -----------------------------------------------------------------
   * This plugin uses the es6-module-transpiler to parse es6 syntax
   * allowing you to write modular applications with layouts that
   * make sense. https://github.com/square/es6-module-transpiler.
   *
   * Importing Modules
   *      - @example: import { bar } from "app/foo/bar";
   *      - @example: import { baz as _baz } from "app/foo/baz";
   *      - @example: import { foo, bar, baz } from "app/commons";
   *
   * Exporting Modules
   *      - @example: export default = foo;
   *      - @example: export { foo };
   *      - @example: export { foo, bar, baz }
   *
   *
   */
  app.log( "app.js" );
})( window, window.document );