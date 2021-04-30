<template>
  <div class="home">
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">上传</el-button>
    <div>
      <div>
        <div>总进度</div>
        <div>
          <el-progress :percentage="uploadPercentage"></el-progress>
        </div>
      </div>

      <el-table :data="data" style="width: 100%" row-key="hash">
        <el-table-column label="hash">
          <template #default="scope">{{ scope.row.hash }}</template>
        </el-table-column>
        <el-table-column label="size">
          <template #default="scope">{{ scope.row.chunk.size }}</template>
        </el-table-column>
        <el-table-column label="process">
          <template #default="scope">
            <el-progress :percentage="scope.row.percentage"></el-progress
          ></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const SIZE = 10 * 1024 * 1024;

export default defineComponent({
  name: 'Home',
  computed: {
    uploadPercentage(): number {
      if (!this.container.file || !this.data.length) return 0;
      const loaded: any = this.data
        .map((item: any) => item.chunk.size * item.percentage)
        .reduce((acc, cur) => acc + cur);
      return parseInt(
        (loaded / ((this.container as any).file as any).size).toFixed(2)
      );
    },
  },
  data: () => ({
    container: {
      file: null,
      work: null,
      hash: null,
    },
    hashPercentage: 0,
    data: [],
  }),
  watch: {
    container: {
      deep: true,
      handler: function () {
        console.log('this.container', this.container);
      },
    },
    data: {
      deep: true,
      handler: function () {
        console.log('this.data.data', this.data);
      },
    },
  },
  methods: {
    request(options: {
      url: string;
      method?: string;
      data: any;
      headers?: Record<string, any>;
      requestList?: any[];
      onProcess?: (e: any) => any;
    }) {
      return new Promise((resolve) => {
        // url:string,
        // method:string,
        // data: any,
        // headers: Record<string, any>,
        // requestList?: any[]
        let {
          url = '',
          method = 'POST',
          data = {},
          headers = {},
          requestList = [],
          onProcess = () => {
            return;
          },
        } = options;
        // headers = headers || {};
        const xhr = new XMLHttpRequest();
        xhr.onprogress = onProcess;
        xhr.open(method, url);
        Object.keys(headers).forEach((key) => {
          xhr.setRequestHeader(key, headers[key]);
        });

        xhr.send(data);

        xhr.onload = (e: any) => resolve(e.target.response);
      });
    },
    handleFileChange(e: any) {
      const [file] = e.target.files;
      if (!file) return;
      // Object.assign(
      //   this.$data,
      //   this.$options.data({ container: { file: null } })
      // );
      this.container.file = file;
    },
    createFileChunk(file: any, size = SIZE) {
      let fileChunkList = [];
      let cur = 0;
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) });
        cur += size;
      }
      return fileChunkList;
    },
    async uploadChunks() {
      const requestList = this.data
        .map(({ chunk, hash, index, fileHash }) => {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('hash', hash);
          formData.append('filename', (this.container.file as any).name);
          formData.append('fileHash', this.container.hash as any);
          return { formData, index };
        })
        .map(async ({ formData, index }) => {
          return this.request({
            url: 'http://localhost:3000',
            data: formData,
            onProcess: this.createProcessHandler(this.data[index]),
          });
        });

      await Promise.all(requestList);
      await this.mergeRequest();
    },
    async handleUpload() {
      if (!this.container.file) {
        return;
      }
      const fileChunkList = this.createFileChunk(this.container.file);
      (this.container.hash as any) = await this.calculateHash(fileChunkList);
      console.log('fileChunksList', fileChunkList);
      (this.data as any[]) = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        fileHash: this.container.hash,
        hash: (this.container.file as any).name + '-' + index,
        index,
        percentage: 0,
      }));
      console.log('this.data', this.data);

      await this.uploadChunks();
    },
    async mergeRequest() {
      await this.request({
        url: 'http://localhost:3000/merge',
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          filename: (this.container.file as any).name,
          size: SIZE,
          fileHash: this.container.hash,
        }),
      });
    },
    createProcessHandler(item: any) {
      return (e: any) =>
        (item.percentage = parseInt(String((e.loaded / e.total) * 100)));
    },
    calculateHash(fileChunkList: any) {
      return new Promise((resolve) => {
        (this.container.work as any) = new Worker('/hash.js');
        (this.container.work as any).postMessage({ fileChunkList });
        (this.container.work as any).onmessage = (e: any) => {
          const { percentage, hash } = e.data;
          this.hashPercentage = percentage;
          if (hash) {
            resolve(hash);
          }
        };
      });
    },
  },
});
</script>

<style>
.flex {
  display: flex;
}
.flex-1 {
  flex: 1;
}

.flex-4 {
  flex: 4;
}
</style>
