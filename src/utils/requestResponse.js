import fs from 'fs'
import path from 'path'
import rmDir from './rmDir.js'

export function sendBackFile (workdir, response, filePath) {
  let fullPath = path.resolve(filePath)
  // console.log("sending back image data",fullPath)
  let stat = fs.statSync(fullPath)

  response.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': stat.size
  })

  let readStream = fs.createReadStream(filePath)
  /* readStream.on('finish',function(){
    console.log("done streaming")
  }) */ // does not work

  // Add this to ensure that the file descriptor is closed in case of error.
  response.on('error', function (err) {
    readStream.end()
  })

  response.on('finish', function () {
    // console.log("done with response, removing folder", workdir)
    rmDir(workdir)
  })

  readStream.pipe(response)
}
