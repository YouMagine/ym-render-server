import fs from 'fs'
import path from 'path'
import http from 'http'

function handleRequest(req, res){
  //console.log("here in request handler",req.url)
  if(req.url === "/v1/designs/0/documents/1?auth_token=X5Ax97m1YomoFLxtYTzb"){
    //console.log("dealing with DOCS")
    let content = {
      "id": 36329,
      "name": "Airplane",
      "description": null,
      "file": {
          "url": "http://localhost:8082/v1/data/model.ply"
      },
      "alternative_formats": {
          "stl_file": {
              "url": "http://localhost:8082/v1/data/model.stl"
          },
      }
    }
    content = JSON.stringify(content)

    res.writeHead(200, {
      'Content-Type': 'application/json'
      ,'Content-Length': Buffer.byteLength(content)
    })
    
    res.end( content )
  }
  else if(req.url === "/v1/data/model.stl"){
    //console.log("sending back model.stl")

    let filePath = './input/model.stl'
    let fullPath = path.resolve(filePath)
    let stat     = fs.statSync(fullPath)

    res.writeHead(200, {
      'Content-Type': 'application/sla',
      'Content-Length': stat.size
    })
    let readStream = fs.createReadStream(fullPath)
    readStream.pipe(res)
  }
 
}

export default function makeServer(PORT, cb){
  let server = http.createServer(handleRequest)
  server.listen(PORT, 'localhost',  function(){
    console.log("Server listening on: http://localhost:%s", PORT)
    cb()
  })
  return server
}