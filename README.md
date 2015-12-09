##jam-headless-renderer

##Installing

  npm install xxxx


##Useage


locally

          node launch.js

on a remote server: 

          xvfb-run -s "-ac -screen 0 1280x1024x24" node launch.js


you also have a few parameters to control the output:


          node launch.js resolution=1024x768 page=1 limit=1 workdir=./foo