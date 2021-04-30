/* eslint-disable @typescript-eslint/no-var-requires */
const http = require('http');

const Controller = require('./controller');
const controller = new Controller();

const server = http.createServer();

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

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
