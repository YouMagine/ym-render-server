import fs from 'fs'
import path from 'path'

import express from 'express'
import bodyParser from 'body-parser'
import assign from 'fast.js/object/assign'//faster object.assign
import {run, getArgs} from './src/utils'

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

////////////////////////

/////////deal with command line args etc
let params = getArgs()

const defaults = {
  port : 3210
  ,testMode:undefined
  ,login:undefined
  ,password:undefined
}
params = assign({},defaults,params)

const {port, testMode, login, password} = params



/////////////////

let app = express()


let rawParser = bodyParser.raw()
let jsonParser = bodyParser.json()
let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(bodyParser.raw())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/', function (req, res) {
  if (!req.body) return res.sendStatus(400)
  console.log(req.headers)
  //console.log("req.body",req.body, req.body.documentId, req.body.designId)
  
  let {resolution,documentId,designId} = req.body
  //console.log("resolution etc",resolution, documentId, designId)


  if(documentId && designId){
    if(!resolution){
      resolution = "1200x900"
    }


    let authData = '' 
    if(testMode && login && password){
      authData = `testMode=${testMode} login=${login} password=${password}`
    } 
    
    const mainCmd = `node launch.js resolution=${resolution} designId=${designId} documentId=${documentId} \
      ${authData} workdir='./tmp' fileName='test.stl'`

    //const cmd = `node launch.js resolution=${resolution} designId=${designId} documentId=${documentId} workdir='./tmp' fileName='test.stl'`
    //const cmd = `xvfb-run -s "-ac -screen 0 ${resolution}x24" ${mainCmd}`
    const cmd = `${mainCmd}`

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


let server = app.listen(port, function () {
  let host = server.address().address;
  let port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
})
