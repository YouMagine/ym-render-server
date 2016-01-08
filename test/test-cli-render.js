import test from 'ava'
import 'babel-core/register'
import fs from 'fs'
import path from 'path'
import http from 'http'
import imageDiff from 'image-diff'
const exec = require('child_process').exec
import makeServer from './helpers/fakeApiServer'

const PORT     = 8082
const fakeApiProdUri = `localhost:${PORT}/v1`

let fakeServer = undefined

test.cb('render cli pipeline',t => {

  fakeServer = makeServer(PORT, runTests)

  function runTests(){
    const cmd = `node ../launch workdir="./tmp" designId=0 documentId=1 urlBase='http' apiBaseProdUri=${fakeApiProdUri}`
    let child = exec(cmd)

    /*child.stdout.on('data', function(data) {
      console.log("stdout",data)
    })
    child.stderr.on('data', function(data) {
      console.log("error",data)
    })*/
    child.on('close', function(code) {
      //does the image exist?
      t.is( fs.existsSync('./tmp/model.stl.png'), true )

      //is the image the same as we expected?
      imageDiff({
        actualImage: './tmp/model.stl.png',
        expectedImage: './exp/exp.png',
      }, function (err, imagesAreSame) {
        t.is(err, null)
        t.is(imagesAreSame,true)
        t.end()
      })  
    })
    
  }
})


// this runs after all tests
test.after('cleanup', t => {
  fs.unlinkSync('./tmp/model.stl.png')
  fs.unlinkSync('./tmp/model.stl')
  fs.rmdirSync('./tmp')
  fakeServer.close()
})