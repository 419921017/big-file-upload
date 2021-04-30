/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('http');

const Controller = require('./controller');
const controller = new Controller();
const path = require('path');
const publishPath = path.resolve(__dirname, '..', 'public');
const server = http.createServer();
const fs = require('fs');
const fse = require('fs-extra');
const url = require('url');

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  // const { pathname } = url.parse(req.url, true);
  // console.log(req.headers);
  // console.log(req.headers['Content-Type']);
  // if (pathname.includes('js')) {
  //   console.log('pathname', pathname);
  //   const dir = await fse.readdir(publishPath);
  //   console.log('dir', dir);
  //   const readStream = fs.createReadStream(path.join(publishPath, pathname));
  //   res.setHeader('Content-Type', 'application/x-javascript');
  //   readStream.pipe(res);
  // }

  if (req.url === '/merge') {
    await controller.handleMerge(req, res);
  }

  if (req.url === '/') {
    await controller.handleFormData(req, res);
  }
});

server.listen(3000, () => {
  console.log('server start at 3000');
});
