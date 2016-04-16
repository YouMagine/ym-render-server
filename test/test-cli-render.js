import test from 'ava'
import 'babel-core/register'
import fs from 'fs'
import imageDiff from 'image-diff'
const exec = require('child_process').exec

import makeServer from './helpers/fakeApiServer'
import { docHandlerHelper } from './helpers/fakeApiServer'

const PORT = 8082
const fakeApiProdUri = `localhost:${PORT}/v1`

let fakeServer

test.before(t => {
  function makeAlternativeFormatDocument () {
    return {
      'id': 36329,
      'name': 'Airplane',
      'file': {
        'url': 'http://localhost:8082/v1/data/model.ply'
      },
      'alternative_formats': {
        'stl_file': {
          'url': 'http://localhost:8082/v1/data/model.stl'
        }
      }
    }
  }

  function makeStandardFormatDocument () {
    return {
      'id': 36329,
      'name': 'Airplane',
      'file': {
        'url': 'http://localhost:8082/v1/data/model.stl'
      }
    }
  }
  let handlers = {
    '/v1/designs/0/documents/1?auth_token=X5Ax97m1YomoFLxtYTzb': docHandlerHelper.bind(null, makeAlternativeFormatDocument()),
    '/v1/designs/0/documents/2?auth_token=X5Ax97m1YomoFLxtYTzb': docHandlerHelper.bind(null, makeStandardFormatDocument())
  }

  // this runs before all tests
  fakeServer = makeServer(PORT, null, handlers)
})

// //////////Now do actual tests

test.cb('renderer cli pipeline (stl available)', t => {
  const cmd = `node ../launch workdir="./tmp" designId=0 documentId=2 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
  let child = exec(cmd)

  child.stdout.on('data', function (data) {
    console.log('stdout', data)
  })
  child.stderr.on('data', function (data) {
    console.log('error', data)
  })

  child.on('close', function (code) {
    // does the image exist?
    t.is(fs.existsSync('./tmp/model.stl.png'), true)

    // is the image the same as we expected?
    imageDiff({
      actualImage: './tmp/model.stl.png',
      expectedImage: './exp/exp.png'
    }, function (err, imagesAreSame) {
      t.is(err, null)
      t.is(imagesAreSame, true)
      t.end()
    })
  })
})

test.cb('renderer cli pipeline (alternative formats)', t => {
  const cmd = `node ../launch workdir="./tmp" designId=0 documentId=1 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
  let child = exec(cmd)

  child.on('close', function (code) {
    // does the image exist?
    t.is(fs.existsSync('./tmp/model.stl.png'), true)

    // is the image the same as we expected?
    imageDiff({
      actualImage: './tmp/model.stl.png',
      expectedImage: './exp/exp.png'
    }, function (err, imagesAreSame) {
      t.is(err, null)
      t.is(imagesAreSame, true)
      t.end()
    })
  })
})

test.afterEach(t => {
  // this runs after each test
  fs.unlinkSync('./tmp/model.stl.png')
  fs.unlinkSync('./tmp/model.stl')
  fs.rmdirSync('./tmp')
})

// this runs after all tests
test.after('cleanup', t => {
  fakeServer.close()
})
