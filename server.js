import fs from 'fs'
import path from 'path'

import express from 'express'
import bodyParser from 'body-parser'

import assign from 'fast.js/object/assign' // faster object.assign
import tmp from 'tmp'

import most from 'most'
import { run, getArgs } from './src/utils'
import rmDir from './src/rmDir'
import { appInPath } from './src/appPath'

function sendBackFile (workdir, response, filePath) {
  let fullPath = path.resolve(filePath)
  // console.log("sending back image data",fullPath)
  let stat = fs.statSync(fullPath)

  response.writeHead(200, {
    'Content-Type': 'image/png',
    'Content-Length': stat.size
  })

  let readStream = fs.createReadStream(filePath)
  /*readStream.on('finish',function(){
    console.log("done streaming")
  })*/ // does not work

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

// ///////deal with command line args etc
let params = getArgs()

const defaults = {
  port: 3210,
  testMode: undefined,
  login: undefined,
  password: undefined
}
params = assign({}, defaults, params)

const {port, testMode, login, password} = params

// ///////////////
// start up server
let app = express()

let rawParser = bodyParser.raw()
let jsonParser = bodyParser.json()
let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(bodyParser.raw())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/', function (req, res) {
  if (!req.body) return res.sendStatus(400)

  let {resolution, documentId, designId} = req.body
  // console.log("req.body",req.body, req.body.documentId, req.body.designId)
  // console.log("resolution etc",resolution, documentId, designId)

  if (documentId && designId) {
    if (!resolution) {
      resolution = '1200x900'
    }

    let authData = ''
    if (testMode && login && password) {
      authData = `testMode=${testMode} login=${login} password=${password}`
    }

    // dir:'./tmp',prefix:'render',
    let workdirBase = './tmp'
    if (!fs.existsSync(workdirBase)) {
      fs.mkdirSync(workdirBase)
    }

    let workdir = tmp.dirSync({template: './tmp/render-XXXXXX'})
    // let workName = tmp.tmpNameSync({ template: 'tmp-XXXXXX.stl' })
    // console.log("workName",workName)
    const workDirPath = path.resolve(workdir.name)

    const mainCmd = `node launch.js resolution=${resolution} designId=${designId} documentId=${documentId} ${authData} workdir="${workDirPath}" `//`

    // const cmd = `node launch.js resolution=${resolution} designId=${designId} documentId=${documentId} workdir='./tmp' fileName='test.stl'`
    // RUN THE RENDERING

    appInPath('xvfb-run')
      .map(xvfb => {
        return xvfb === true ? `xvfb-run -a -s "-ac -screen 0 ${resolution}x24" ${mainCmd}` : `${mainCmd}`
      })
      .tap(cmd => console.log('launching', cmd))
      .flatMap(cmd => run(cmd))
      .flatMapError(function (error) {
        // console.log("error in launch",error)
        return most.throwError(error)
      })
      /* .observe(function(e){
        //console.log("progress:",e)
        return e
      })*/
      .drain()
      .then(function (e) {
        // console.log("done with render",e)
        const filePath = `${workDirPath}/output.png`
        sendBackFile(workDirPath, res, filePath)
      })
      .catch(function (error) {
        console.log(`error rendering design: ${designId} document: ${documentId}`, error)
        // FIXME: temporary
        try {
          error = error.replace('Potentially unhandled rejection [1] ', '')
          error = error.replace('Potentially unhandled rejection [2] ', '')
        } catch(e) {}

        res.status(500).send(error)
      })
  } else {
    console.log('lacking document/designId')
    res.status(500).send('lacking document/designId')
  }
})

let server = app.listen(port, function () {
  let host = server.address().address
  let port = server.address().port

  console.log('Renderer listening at http://%s:%s', host, port)
})
