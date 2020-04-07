import fs from 'fs'
import path from 'path'
import tmp from 'tmp'

import express from 'express'
import bodyParser from 'body-parser'

import most from 'most'

import { getArgs } from './utils/args.js'
import { run } from './utils/run.js'
import { appInPath } from './utils/appPath.js'
import { sendBackFile } from './utils/requestResponse.js'

// setup environemental variables
// require('env2')(path.resolve(__dirname, '../.env'))

// ///////deal with command line args etc
let params = getArgs()

const defaults = {
  port: 3210,
  testMode: undefined,
  login: undefined,
  password: undefined,
  token: undefined
}
params = Object.assign({}, defaults, params)

const { port, testMode, login, password, token } = params

// ///////////////
// start up server
const app = express()

app.use(bodyParser.raw())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/', function (req, res) {
  if (!req.body) return res.sendStatus(400)

  let { resolution, documentId, designId } = req.body
  console.log('req.body', req.body, req.body.documentId, req.body.designId)
  // console.log('resolution etc', resolution, documentId, designId)

  if (documentId && designId) {
    if (!resolution) {
      resolution = '1200x900'
    }

    let authData = ''
    if (testMode && login && password) {
      authData = `testMode=${testMode} login=${login} password=${password}`
    }
    if (!testMode) {
      authData = `token=${token || req.body.token || ''}`
    }

    // dir:'./tmp',prefix:'render',
    let workdirBase = './tmp'
    if (!fs.existsSync(workdirBase)) {
      fs.mkdirSync(workdirBase)
    }

    const workdir = tmp.dirSync({ template: './tmp/render-XXXXXX' })
    const workDirPath = path.resolve(workdir.name)
    const outputFilePath = `${workDirPath}/output.png`
    // start the part the uses fetchYMRenderable
    // no warning is used to supress node experimental + ESM warnings
    const mainCmd = `node --no-warnings ./src/fetchYMRenderable.js resolution=${resolution} designId=${designId} documentId=${documentId} ${authData} workdir="${workDirPath}" `

    // RUN THE RENDERING
    appInPath('xvfb-run')
      .map(xvfb => {
        return xvfb === true ? `xvfb-run -a -s "-ac -screen 0 ${resolution}x24" ${mainCmd}` : `${mainCmd}`
      })
      .tap(cmd => console.log('launching', cmd))
      .flatMap(cmd => run(cmd))
      .flatMapError(function (error) {
        console.log('whoops', error)
        return most.throwError(error)
      })
      .drain()
      .then(function (e) {
        // console.log("done with render",e)
        sendBackFile(workDirPath, res, outputFilePath)
      })
      .catch(function (error) {
        console.log(`error rendering design: ${designId} document: ${documentId}`, error)
        // FIXME: temporary
        try {
          error = error.replace('Potentially unhandled rejection [1] ', '')
          error = error.replace('Potentially unhandled rejection [2] ', '')
        } catch (e) {}

        res.status(500).send(error)
      })
  } else {
    console.log('lacking document/designId')
    res.status(500).send('lacking document/designId')
  }
})

const server = app.listen(port, function () {
  const host = server.address().address
  const port = server.address().port
  console.log('Renderer listening at http://%s:%s', host, port)
})
