import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root: resolve('apps/web'), publicDir: 'public',
  server: {host:'127.0.0.1',port:4317,strictPort:true,proxy:{'/api':'http://127.0.0.1:4318'}},
  build: {outDir:'dist',emptyOutDir:true}});
