#!/bin/bash

# cron tab for running every week asunday at midnight 0 0 * * 0 ./ym-render-server/cleanup.sh, UPDATE/ADAPT WHAT IS NEEDED
# first delete files
# 0 0 * * 0 find /home/<USER>/jam/ym-render-server/tmp/* -mtime +7 -name render-* -type f -delete
# the delete empty folders
# 0 1 * * 0 find /home/<USER>/jam/ym-render-server/tmp/* -mtime +7 -name render-* -type d -delete 
# or (better option, the find command can be passed directly to cron)
# 0 0 * * 0 find /home/<USER>/jam/ym-render-server/tmp/* -mtime +7 -name render-* -type d -prune -exec rm -rf {} \;
