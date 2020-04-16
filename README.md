# ym-render-server

## General

This includes all the tooling to generate **static images/renders using Jam** :  ie

- a command line tool
- a web server ( *post* a **design id** + **document id** combo, get a rendered image of that design back)
- it does **NOT** generate meta data, stats, or any other data
- it also does **NOT** slice the 3d model, convert them, or make coffee for you: single responsibility, better maintainability
- it depends on the youmagine V1 api
- it wrapps the actual [headless renderer](https://github.com/usco/usco-headless-renderer) (migration in progress)

>NOTE:
This only works in **Node 13** & above (native es-module support needed) (usually via nvm, aka nvm install v13.12.2 at this time)

## Installing

  * clone the repository

  and type

  ```
    npm install --production 
  ```

> Note: prefer the use of the production flag, unless you want to develop on your local machine/ make changes

## System dependencies

You also need to install a few packages on your system (needed for headless webgl rendering): for Debian/Ubuntu these are :
(see usco-headless-renderer for more details)

- [x] sudo apt-get install pkg-config
- [x] sudo apt-get install xvfb
- [x] sudo apt-get install libx11-dev
- [x] sudo apt-get install libxi-dev
- [x] sudo apt-get install libgl1-mesa-dev

## Usage

### server mode

> Note : default port is 3210

#### for production environments

Install ***pm2*** globally:

```npm install pm2@latest -g```

then at the root of your home preferable

```pm2 start <PATHTO>/ym-render-server/launch-server.js --name ym-renderer -- port=5252```

#### for testing environments

> if you only want to do small tests, you can launch the server without `forever`:

```
  node launch-server.js
```


----------
#### local mode

```
  node launch-server.js
```

on a remote server:

```
  xvfb-run -s "-ac -screen 0 1280x1024x24" node launch-server.js
```


you also have a few parameters to control the output:

##### batch mode:

```
  node launch-server.js resolution=1024x768 page=1 limit=1 workdir=./foo
```

##### design & document mode:

```
  node launch-server.js resolution=1024x768 designId=10890 documentId=1 workdir=./foo
```


##### managing existing running instances

List existing processes
```
  pm2 list
```

Stop given process (with given ID)
```
  pm2 stop <ID>
```

#### configure auto restart on system reboot

Follow the instructions here https://pm2.keymetrics.io/docs/usage/startup/
ie: 

```pm2 startup```

copy & paste the instructions

and then

```pm2 save```

all done !

#### automatic cleanup of temporary files

create a crontab entry like this one

0 0 * * 0 find <PATHTO>/tmp/* -mtime +7 -name render-* -type d -prune -exec rm -rf {} \;
