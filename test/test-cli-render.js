import test from 'ava'
import 'babel-core/register'
import fs from 'fs'
import imageDiff from 'image-diff'

import makeServer from './helpers/fakeApiServer'
import { docHandlerHelper } from './helpers/fakeApiServer'

import tmp from 'tmp'
const exec = require('child_process').exec

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

  function makeStandardFormatDocument3mf () {
    return {
      'id': 36340,
      'name': 'Other',
      'file': {
        'url': 'http://localhost:8082/v1/data/cube_gears.3mf'
      }
    }
  }

  let handlers = {
    '/v1/designs/0/documents/1?auth_token=LNtu2UMZWccR8YJhTCi7': docHandlerHelper.bind(null, makeAlternativeFormatDocument()),
    '/v1/designs/0/documents/2?auth_token=LNtu2UMZWccR8YJhTCi7': docHandlerHelper.bind(null, makeStandardFormatDocument()),
    '/v1/designs/0/documents/3?auth_token=LNtu2UMZWccR8YJhTCi7': docHandlerHelper.bind(null, makeStandardFormatDocument3mf())
  }

  // this runs before all tests
  fakeServer = makeServer(PORT, null, handlers)
})

// //////////Now do actual tests

test.cb('renderer cli pipeline (stl available)', t => {
  const workdir = t.context.workdir
  const cmd = `node ../launch workdir=${workdir} designId=0 documentId=2 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
  let child = exec(cmd)

  child.stdout.on('data', function (data) {
    console.log('stdout', data)
  })
  child.stderr.on('data', function (data) {
    console.log('error', data)
  })

  child.on('close', function (code) {
    // does the image exist?
    t.is(fs.existsSync(`${workdir}/output.png`), true)

    // is the image the same as we expected?
    imageDiff({
      actualImage: `${workdir}/output.png`,
      expectedImage: './exp/exp.png'
    }, function (err, imagesAreSame) {
      t.is(err, null)
      t.is(imagesAreSame, true)
      t.end()
    })
  })
})

test.cb('renderer cli pipeline (3mf available)', t => {
  const workdir = t.context.workdir

  const cmd = `node ../launch workdir="${workdir}" designId=0 documentId=3 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
  let child = exec(cmd)

  child.stdout.on('data', function (data) {
    console.log('stdout', data)
  })
  child.stderr.on('data', function (data) {
    console.log('error', data)
  })

  child.on('close', function (code) {
    // does the image exist?
    t.is(fs.existsSync(`${workdir}/output.png`), true)

    // is the image the same as we expected?
    imageDiff({
      actualImage: `${workdir}/output.png`,
      expectedImage: './exp/exp.3mf.png'
    }, function (err, imagesAreSame) {
      t.is(err, null)
      t.is(imagesAreSame, true)
      t.end()
    })
  })
})

test.cb('renderer cli pipeline (alternative formats)', t => {
  const workdir = t.context.workdir
  const cmd = `node ../launch workdir="${workdir}" designId=0 documentId=1 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
  let child = exec(cmd)

  child.on('close', function (code) {
    // does the image exist?
    t.is(fs.existsSync(`${workdir}/output.png`), true)

    // is the image the same as we expected?
    imageDiff({
      actualImage: `${workdir}/output.png`,
      expectedImage: './exp/exp.png'
    }, function (err, imagesAreSame) {
      t.is(err, null)
      t.is(imagesAreSame, true)
      t.end()
    })
  })
})

test.beforeEach(t => {
  let workdirBase = './tmp'
  if (!fs.existsSync(workdirBase)) {
    fs.mkdirSync(workdirBase)
  }
  let workdir = tmp.dirSync({ template: './tmp/render-XXXXXX' })
  t.context.workdir = workdir.name
})

test.afterEach(t => {
  const workdir = t.context.workdir
  // this runs after each test
  try { fs.unlinkSync(`${workdir}/model.stl`) } catch (e) {}
  try { fs.unlinkSync(`${workdir}/cube_gears.3mf`) } catch (e) {}
  try { fs.unlinkSync(`${workdir}/output.png`) } catch (e) {}
  fs.rmdirSync(workdir)
  fs.rmdirSync('./tmp')
})

// this runs after all tests
test.after('cleanup', t => {
  fakeServer.close()
})
