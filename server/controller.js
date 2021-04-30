/* eslint-disable @typescript-eslint/no-var-requires */

const multiparty = require('multiparty');
const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');

const UPLOAD_DIR = path.resolve(__dirname, '..', 'target');

const pipeStream = (path, writeStream) =>
  new Promise((resolve) => {
    const readStream = fse.createReadStream(path);
    readStream.on('end', () => {
      fse.unlinkSync(path);
      resolve();
    });
    readStream.on('data', (chunk) => {
      console.log(`readStream.on('data'`, chunk);
    });
    readStream.pipe(writeStream);
  });

const mergeFileChunk = async (filePath, fileName, size) => {
  const chunkDir = path.resolve(UPLOAD_DIR, filePath);
  const chunkPaths = await fse.readdir(chunkDir);
  // 根据切片下标进行排序
  // 否则直接读取目录的获得的顺序可能会错乱
  chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);

  await Promise.all(
    chunkPaths.map((chunkPath, index) => {
      const writeStream = fse.createWriteStream(
        path.resolve(UPLOAD_DIR, fileName),
        {
          start: index * size,
          end: (index + 1) * size,
        }
      );
      writeStream.on('drain', (chunk) => {
        console.log('drain', chunk);
      });
      writeStream.on('error', (error) => {
        console.log('writeStream', 'error', error);
      });

      return pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        writeStream
      );
    })
  );
  fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
};

const resolvePost = (req) =>
  new Promise((resolve) => {
    let chunk = '';
    req.on('data', (data) => {
      chunk += data;
    });
    req.on('end', () => {
      resolve(JSON.parse(chunk));
    });
  });

class Controller {
  async handleMerge(req, res) {
    const { filename, size } = await resolvePost(req);

    let index = filename.lastIndexOf('.');
    const fileDir = filename.slice(0, index);

    const filePath = path.resolve(UPLOAD_DIR, fileDir);

    await mergeFileChunk(filePath, filename, size);
    return res.end(
      JSON.stringify({
        code: 0,
        message: `${filename} merged success`,
      })
    );
  }

  async handleFormData(req, res) {
    const multipart = new multiparty.Form();
    multipart.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        res.status = 500;
        res.end('process file chunk failed');
        return;
      }
      const [chunk] = files.chunk;
      const [hash] = fields.hash;
      const [filename] = fields.filename;
      let index = filename.lastIndexOf('.');
      const chunkName = filename.slice(0, index);
      const chunkDir = path.resolve(UPLOAD_DIR, chunkName);

      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir);
      }

      await fse.move(chunk.path, path.resolve(chunkDir, hash));

      res.end('received file chunk');
    });
  }

  async handleVerifyUpload(req, res) {
    // console.log(req, res);
    return false;
  }
}

module.exports = Controller;
