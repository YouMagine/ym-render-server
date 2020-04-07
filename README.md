# ym-render-server

## General

This includes all the tooling to generate **static images/renders using Jam** :  ie

- a command line tool
- a web server ( *post* a **design id** + **document id** combo, get a rendered image of that design back)
- it does **NOT** generate meta data, stats, or any other data
- it also does **NOT** slice the 3d model, convert them, or make coffee for you: single responsibility, better maintainability
- it depends on the youmagine V1 api
- it wrapps the actual [headless renderer](https://github.com/usco/usco-headless-renderer) (migration in progress)

## Installing

  * clone the repository

  and type

  ```
    npm install
  ```

## Usage

### server mode

> Note : default port is 3210

> Also: the `npm start` command will run the server wraped by the forever tool, to ensure continued uptime

#### for production environments

```
  npm start -- port=4242
```

#### for testing environments

```
  npm start -- testMode=true testMode=true login='xx' password='xx'
```


You can stop the server at anytime using

```
  npm stop
```

> if you only want to do small tests, you can launch the server without `forever`:

```
  node launch-server.js
```


----------
####local mode

```
  node launch.js
```

on a remote server:

```
  xvfb-run -s "-ac -screen 0 1280x1024x24" node launch.js
```


you also have a few parameters to control the output:

##### batch mode:

```
  node launch.js resolution=1024x768 page=1 limit=1 workdir=./foo
```

##### design & document mode:

```
  node launch.js resolution=1024x768 designId=10890 documentId=1 workdir=./foo
```


##### managing existing running instances

List existing processes
```
  node_modules/forever/bin/forever list
```

Stop given process (with given ID)
```
  node_modules/forever/bin/forever stop ID
```

and then restart the correct one from the working directory using npm run start (see previous instructions)
