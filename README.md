plin.co
=======

It's a plin.co for the modern era!

You'll need the dev.env file.

To run, use the command `foreman start -f Procfile_dev -e dev.env`.

Config variables you can change are in config.js.

##Calibration

`/calibrate` takes you to the Calibration Machine. Just click "Start Calibrating".

Click on a pin, and the orange ring should jump to it. This is now in detect mode. Whatever pin is struck last will be saved. When a pin is struck, the green ring will jump to where it thinks that last strike was.

Make sure to click "Stop Calibrating" when done, so the server knows to stop remapping.

You may need to have `/live` open in another window. Bug?

##Testing

`/live/test` will open the visualization and immediatlye run a simulation when you arrive at it. Depending on the config variables, it will tweet and/or save this test.

Additionally, once the visualization is running, you can POST data to `/play` to simulate a test drop. Passing the parameter `skip=true` will not register the pins for saving or tweet that run.

##Live

`/live` opens the visualisation and `/admin` will get to the web admin section.

Put in twitter user names and hit enter, this will create a persistent queue.

"Start Run" will ready the backend for data. It will create a new row in history, and the complete column will be yellow. After the first pin is struck, the images will be saved, processed, and tweeted (if set up in the config), based on the variable `gifLength` for each visualization.

After saved has turned green, the run is ready to be completed. Hit "Complete Run" and the yellow column should turn green. You're now ready to start the next run, or you can switch between visualizations for free mode.