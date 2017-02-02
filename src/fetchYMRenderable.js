import fs from 'fs'
import path from 'path'
import { from, throwError } from 'most'

import { run } from './utils/run'
import { saveFile } from './utils/utils'
import { getArgs } from './utils/args'
import { makeRequest } from './utils/makeRequest'

console.log('fetching documents of designs to render')

// ///////deal with command line args etc
let params = getArgs()
const handledFormats = ['stl', '3mf', 'obj', 'ctm']

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
params = Object.assign({}, defaults, params)

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
      let {outputPath} = data
      let sourceDataPath = outputPath
      let renderOutputPath = path.resolve(path.dirname(outputPath), 'output.png')

      const jamPath = path.resolve(__dirname, '../node_modules/usco-headless-renderer/dist/index.js')
      console.log('outputPath', sourceDataPath, renderOutputPath)
      const cmd = `node ${jamPath} input=${sourceDataPath} output=${renderOutputPath} resolution=${resolution}`

      console.log('running ', cmd)
      return run(cmd)
        .flatMapError(function (e) {
          console.log('error in renderer', e)
          return throwError(e)
        })
        // .flatMapError(e=>throwError("error in  renderer",e))
        //.flatMapEnd(postProcess.bind(null, renderOutputPath)) //we do not use post processing anymore
    }

    function postProcess (renderOutputPath) {
      let ppCmd = `convert ${renderOutputPath} -colorspace gray -level-colors "black,#FF0000" -define modulate:colorspace=HSB -modulate 100,200,108 ${renderOutputPath}`
      let ppCropCmd = `convert ${renderOutputPath} -crop +0+1 ${renderOutputPath}`

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
