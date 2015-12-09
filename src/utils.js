import Subject from './subject/subject'
import request from 'request'

import fs from 'fs'
import url from 'url'
const exec = require('child_process').exec
const spawn = require('child_process').spawn

export function makeRequest(uri){
  const {sink, stream} = Subject()

  request(uri, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      sink.add(JSON.parse(body))
    }
    else{
      console.log("error",error)
    }
  })
  return stream
}


export function run(cmd){
  const {sink, stream} = Subject()

  exec(cmd, function(error, stdout, stderr) {
    if(error){
      console.log("error",error)
      sink.error(error)
    }
    else{
      sink.add(stdout)
    }
  }) 

  return stream
}


export function download_file_wget (file_url, download_dir) {

  // extract the file name
  var file_name = url.parse(file_url).pathname.split('/').pop()
  // compose the wget command
  var wget = 'wget -P ' + download_dir + ' ' + file_url
  // excute wget using child_process' exec function

  var child = exec(wget, function(err, stdout, stderr) {
      if (err) throw err;
      else console.log(file_name + ' downloaded to ' + download_dir)
  })

}

export function download_file_curl(file_url, download_dir) {

    // extract the file name
    var file_name = url.parse(file_url).pathname.split('/').pop()
    // create an instance of writable stream
    var file = fs.createWriteStream(download_dir + file_name)
    // execute curl using child_process' spawn function
    var curl = spawn('curl', [file_url]);
    // add a 'data' event listener for the spawn instance
    curl.stdout.on('data', function(data) { file.write(data); })
    // add an 'end' event listener to close the writeable stream
    curl.stdout.on('end', function(data) {
        file.end();
        console.log(file_name + ' downloaded to ' + download_dir)
    });
    // when the spawn child process exits, check if there were any errors and close the writeable stream
    curl.on('exit', function(code) {
        if (code != 0) {
            console.log('Failed: ' + code)
        }
    })
}