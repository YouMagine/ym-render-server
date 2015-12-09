//let request = require('request')
//var open = require("open");
//open("http://www.google.com")
import fs from 'fs'
import most from 'most'
import assign from 'fast.js/object/assign'//faster object.assign
import {from} from 'most'
import Subject from './src/subject/subject'


import request from 'request'
import url from 'url'
import path from 'path'

const exec = require('child_process').exec
const spawn = require('child_process').spawn

import {makeRequest, run, download_file_curl} from './src/utils'


console.log("fetching documents of designs to render")

/////////deal with command line args etc
let args = process.argv.slice(2)

let params = {}
if(args.length>0){
  params = args.reduce(function(combo,cur){
    let [name,val]= cur.split("=")
    combo[name] = val
    return combo
  },{})
}

//const designsUri =  "https://api.youmagine.com/v1/designs?auth_token=X5Ax97m1YomoFLxtYTzb"
//const documentsUri = 'https://api.youmagine.com/v1/designs/9920/documents?auth_token=X5Ax97m1YomoFLxtYTzb'

const defaults = {
  resolution:'640x480'
  ,workdir:'./tmp'
  ,designsUri:'https://api.youmagine.com/v1/designs?auth_token=X5Ax97m1YomoFLxtYTzb'
}
params = assign({},defaults,params)

let {workdir,designsUri,resolution} = params

designsUri = ["page","limit"].reduce(function(combo,paramName){
    combo += `&${paramName}=${params[paramName]}`
    return combo
  },designsUri)


//setup working dir, if it does not exist
if (!fs.existsSync(workdir)){
    fs.mkdirSync(workdir)
}

//start fetching data
const documents$  = makeRequest(designsUri)
    .flatMap( designs => from(designs) ) //array of designs to designs one by one "down the pipe"  
    .flatMap( design=> { // for each design, request  
      let documentsUri = `https://api.youmagine.com/v1/designs/${design.id}/documents?auth_token=X5Ax97m1YomoFLxtYTzb`
      return makeRequest(documentsUri)
    })
    .flatMap( documents => from(documents) )//array of documents to documents one by one "down the pipe" 

const renderableDocuments$ =  documents$
  .filter(doc=>doc.file_contains_3d_model === true)
  .map(doc=>{
    return {url:doc.file.url,id:doc.id}
  })
  
//renderableDocuments$
//  .forEach(e=>console.log("documents",e))

const downloadedDocument$ = renderableDocuments$
  //.take(5)
  .map(function(doc){
    console.log("document",doc)
    /*let fileData$ = makeRequest(doc.url)
      .map(data => {
        fs.createWriteStream(data)
      })
      .forEach(e=>console.log("fileData",e))*/
    //download_file_curl(doc.url, './')
    
    function saveFile(fileUrl){
      const {sink, stream} = Subject()

      let urlData    = url.parse( fileUrl )
      let fileName   = path.basename(urlData.pathname)
      let outputPath = path.join(workdir,fileName)
      
      let file = fs.createWriteStream(outputPath)
      let r = request(doc.url).pipe(file)

      /*file.once('close',function(e){
        console.log("file done",e)
      })*/

      file.once('finish',function(e){
        //console.log("file done")
        sink.add({fileName,outputPath})
      })
      return stream
    }


    function runRenderer(data){
      let {fileName,outputPath} = data
        //const cmd = `node ../Jam/dist/jam-headless.js --model ${outputPath} --resolution ${resolution}` 
        const cmd = `node ../Jam/dist/jam-headless.js ${outputPath} ${resolution}` 

        exec(cmd, function(error, stdout, stderr) {
          // command output is in stdout
          console.log(stdout)
          if(error){
            console.log("error in  renderer",error, stdout, stderr)
          }
          else{
            //RUN post process
            let ppCmd = `convert ${outputPath}.png -colorspace gray -level-colors "black,#FF0000" -define modulate:colorspace=HSB -modulate 100,200,108 ${outputPath}.png` 
            console.log("cmd",ppCmd)

            run(ppCmd)
          }

        }) 
    }

    saveFile(doc.url)
      .tap(runRenderer)
      .forEach(e=>e)
       
  })
  .forEach(e=>e)

