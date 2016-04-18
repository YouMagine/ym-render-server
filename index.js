// let request = require('request')
// var open = require("open")
// open("http://www.google.com")
import fs from 'fs'
import assign from 'fast.js/object/assign' // faster object.assign
import { from, throwError } from 'most'

import path from 'path'
import { makeRequest, run, saveFile, getArgs } from './src/utils'

console.log('fetching documents of designs to render')

// ///////deal with command line args etc
let params = getArgs()

/* const apiBaseProdUri = 'api.youmagine.com/v1'
const apiBaseTestUri = 'api-test.youmagine.com/v1'*/
const handledFormats = ['stl', '3mf', 'obj']

const defaults = {
  resolution: '640x480',
  workdir: './tmp',
  designsUri: 'https://api.youmagine.com/v1/designs?auth_token=LNtu2UMZWccR8YJhTCi7',
  apiBaseProdUri: 'api.youmagine.com/v1',
  apiBaseTestUri: 'api-test.youmagine.com/v1',
  urlBase: 'https',

  documentId: undefined,
  designId: undefined,
  fileName: undefined,
  testMode: undefined,
  login: undefined,
  password: undefined
}
params = assign({}, defaults, params)

let {workdir, designsUri, apiBaseProdUri, apiBaseTestUri, urlBase, resolution, https, testMode, login, password} = params

designsUri = ['page', 'limit'].reduce(function (combo, paramName) {
  combo += `&${paramName}=${params[paramName]}`
  return combo
}, designsUri)

workdir = path.resolve(workdir)
// setup working dir, if it does not exist
if (!fs.existsSync(workdir)) {
  fs.mkdirSync(workdir)
}

let apiBaseUri = testMode !== undefined ? apiBaseTestUri : apiBaseProdUri
let authData = (login !== undefined && password !== undefined) ? (`${login}:${password}@`) : ''
// console.log("apiBaseProdUri",apiBaseProdUri,apiBaseUri, params)

// start fetching data
let documents$
if (params.documentId && params.designId) {
  let documentsUri = `${urlBase}://${authData}${apiBaseUri}/designs/${params.designId}/documents/${params.documentId}?auth_token=LNtu2UMZWccR8YJhTCi7`
  documents$ = makeRequest(documentsUri)
} else {
  documents$ = makeRequest(designsUri)
    .flatMap(designs => from(designs)) // array of designs to designs one by one "down the pipe"
    .flatMap(design => { // for each design, request
      let documentsUri = `https://api.youmagine.com/v1/designs/${design.id}/documents?auth_token=LNtu2UMZWccR8YJhTCi7`
      return makeRequest(documentsUri)
    })
    .flatMap(documents => from(documents)) // array of documents to documents one by one "down the pipe"
    .filter(doc => doc.file_contains_3d_model === true)
}

function CleanError (msg) {
  Error.call(this)

  // By default, V8 limits the stack trace size to 10 frames.
  Error.stackTraceLimit = 1

  // Customizing stack traces
  Error.prepareStackTrace = function (err, stack) {
    return ''
  }

  Error.captureStackTrace(this)

  this.message = msg
  this.name = 'CleanError'
}

CleanError.prototype.__proto__ = Error.prototype

// filter documents to find those that are renderable
const renderableDocuments$ = documents$
  .map(function (doc) { // deal with alternative formats correctly
    let url = doc.file.url
    let ext = path.extname(url)
    if (!ext) {
      throw new CleanError('Unhandled format')
    }
    ext = ext.toLowerCase().replace('.', '')

    if (handledFormats.indexOf(ext) === -1) {
      if (doc.alternative_formats && Object.keys(doc.alternative_formats).length === 0) {
        throw new CleanError('Unhandled format, and no alternative formats')
      }
      url = doc.alternative_formats.stl_file.url
      // console.log("doc",doc.alternative_formats)

      if (url === null) {
        throw new CleanError('Unhandled format, and no alternative formats')
      }
    }

    return {url, id: doc.id}
  })

// do the rendering etc
renderableDocuments$
  .tap(doc => console.log('going to render document', doc))
  .map(function (doc) {
    function render (data) {
      let {fileName, outputPath} = data
      const jamPath = path.resolve(__dirname, './node_modules/jam/dist/jam-headless.js')
      const cmd = `node ${jamPath}  ${outputPath} ${resolution}`
      console.log('running ', cmd)
      return run(cmd)
        .flatMapError(function (e) {
          console.log('error in renderer', e)
          return throwError(e)
        })
        // .flatMapError(e=>throwError("error in  renderer",e))
        .flatMapEnd(postProcess.bind(null, outputPath))
    }

    function postProcess (outputPath) {
      let ppCmd = `convert ${outputPath}.png -colorspace gray -level-colors "black,#FF0000" -define modulate:colorspace=HSB -modulate 100,200,108 ${outputPath}.png`
      let ppCropCmd = `convert ${outputPath}.png -crop +0+1 ${outputPath}.png`

      return run(ppCmd)
        .flatMapEnd(e => run(ppCropCmd))
    }

    return saveFile(workdir, doc.url, params.fileName)
      .flatMap(render)
      .forEach(e => e)
      .then(e => console.log('done'))
  })
  // .flatMapError(error=>most.throwError(error))
  .forEach(e => e)
  /* .catch(function(error){
    console.log("error something",error)
    throw error
  })*/

  // //////////////////////////
  // since we have promises ?
  /* process.on("unhandledRejection", function(promise, reason){
    console.log("promise",promise,reason)
  })*/
  /* process.on('unhandledRejection', function(reason, p){
      console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason)
      //throw reason
  })
  process.on('rejectionHandled', function(key) {
      //reportHandled(key)
      console.log("handled",key)
  })*/
