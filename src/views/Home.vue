<template>
  <div class="home">
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">上传</el-button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { request } from '../api/request';

const SIZE = 10 * 1024 * 1024;

export default defineComponent({
  name: 'Home',
  data: () => ({
    container: {
      file: null,
    },
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
        } = options;
        // headers = headers || {};
        const xhr = new XMLHttpRequest();
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
        .map(({ chunk, hash }) => {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('hash', hash);
          formData.append('filename', (this.container.file as any).name);
          return { formData };
        })
        .map(({ formData }) => {
          return this.request({ url: 'http://localhost:3000', data: formData });
        });
      console.log('requestList', requestList);

      await Promise.all(requestList);
      await this.mergeRequest();
    },
    async handleUpload() {
      if (!this.container.file) {
        return;
      }
      const fileChunksList = this.createFileChunk(this.container.file);
      console.log('fileChunksList', fileChunksList);
      (this.data as any[]) = fileChunksList.map(({ file }, index) => ({
        chunk: file,
        hash: (this.container.file as any).name + '-' + index,
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
        }),
      });
    },
  },
});
</script>
