const PORT=3210
import fs from 'fs'
import path from 'path'

import express from 'express'
import bodyParser from 'body-parser'
import {run} from './src/utils'

function sendBackFile(response, filePath){
  let fullPath = path.resolve(filePath)
  console.log("sending back image data",fullPath)
  let stat = fs.statSync(fullPath)

  response.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': stat.size
  })

  let readStream = fs.createReadStream(filePath)

  // Add this to ensure that the file descriptor is closed in case of error.
  response.on('error', function(err) {
    readStream.end()
  })

  readStream.pipe(response)
}

let app = express()


let rawParser = bodyParser.raw()
let jsonParser = bodyParser.json()
let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(bodyParser.raw())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/', function (req, res) {
  if (!req.body) return res.sendStatus(400)

  //console.log("req.body",req.body, req.body.documentId, req.body.designId)
  
  let {resolution,documentId,designId} = req.body
  //console.log("resolution etc",resolution, documentId, designId)


  if(documentId && designId){
    if(!resolution){
      resolution = "1200x900"
    }
    const cmd = `node launch.js resolution=${resolution} designId=${designId} documentId=${documentId} workdir='./tmp' fileName='test.stl'`
    //RUN THE RENDERING
    console.log("launching",cmd)
    run(cmd)
      .drain()
      .then(function(e){
        //res.send('Done with render')
        console.log("done with render",e)
        const filePath = './tmp/test.stl.png'
        sendBackFile(res, filePath)
      })

    
  }
  else{
    console.log("lacking document/designId")
    res.send("lacking document/designId")
    res.sendStatus(500)
  }
  
  
})


let server = app.listen(PORT, function () {
  let host = server.address().address;
  let port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
})