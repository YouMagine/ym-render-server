import request from 'request'
import create from '@most/create'

import fs from 'fs'
import url from 'url'
import path from 'path'
import { exec, spawn } from 'child_process'

export function saveFile (workdir, fileUrl, fileName) {
  return create.create((add, end, error) => {
    try {
      let urlData = url.parse(fileUrl)

      if (fileName === undefined) {
        fileName = path.basename(urlData.pathname)
        console.log('fileName', fileName)
      }
      let outputPath = path.join(workdir, fileName)

      let file = fs.createWriteStream(outputPath)

      file.on('open', function (fd) {
        request(fileUrl).pipe(file)
      })

      file.on('error', function (e) {
        error(e)
      })
      file.once('finish', function (e) {
        add({ fileName, outputPath })
        end()
      })
    } catch (err) {
      error(err)
    }
  })
}

export function download_file_wget (file_url, download_dir) {
  // extract the file name
  var file_name = url.parse(file_url).pathname.split('/').pop()
  // compose the wget command
  var wget = 'wget -P ' + download_dir + ' ' + file_url
  // excute wget using child_process' exec function

  var child = exec(wget, function (err, stdout, stderr) {
    if (err) throw err
    else console.log(file_name + ' downloaded to ' + download_dir)
  })
}

export function download_file_curl (file_url, download_dir) {
  // extract the file name
  var file_name = url.parse(file_url).pathname.split('/').pop()
  // create an instance of writable stream
  var file = fs.createWriteStream(download_dir + file_name)
  // execute curl using child_process' spawn function
  var curl = spawn('curl', [file_url])
  // add a 'data' event listener for the spawn instance
  curl.stdout.on('data', function (data) { file.write(data) })
  // add an 'end' event listener to close the writeable stream
  curl.stdout.on('end', function (data) {
    file.end()
    console.log(file_name + ' downloaded to ' + download_dir)
  })
  // when the spawn child process exits, check if there were any errors and close the writeable stream
  curl.on('exit', function (code) {
    if (code != 0) {
      console.log('Failed: ' + code)
    }
  })
}
