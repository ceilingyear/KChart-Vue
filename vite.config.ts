import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path"; //引入的重置指向
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "@vant/auto-import-resolver";
import commonjs from "vite-plugin-commonjs";
// import { compression } from "vite-plugin-compression2";
// import vitePluginRequireTransform from "vite-plugin-require-transform";

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    base:'http://localhost:3001/',
    host:'192.168.110.97',
    // host:'192.168.0.110',
    port: 3001, //改变访问本地端口号
    // proxy: {
    //   '/': {
    //     target: 'https://api.bitget.com',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/$/, ''),
    //   },
    // },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      plugins: [

      ],
    },
  },
  resolve: {
    alias: {
      //制订别名规则
      "@": path.resolve(__dirname, "./src"), //用于配置‘@’重定向为当前目录下的src目录
      com: path.resolve(__dirname, "./src/components"), //用于配置‘com’重定向为当前目录下的src/components目录
      // This Rollup aliases are extracted from @esbuild-plugins/node-modules-polyfill,
      // see https://github.com/remorses/esbuild-plugins/blob/master/node-modules-polyfill/src/polyfills.ts
      // process and buffer are excluded because already managed
      // by node-globals-polyfill
      util: "rollup-plugin-node-polyfills/polyfills/util",
      sys: "util",
      events: "rollup-plugin-node-polyfills/polyfills/events",
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      path: "rollup-plugin-node-polyfills/polyfills/path",
      querystring: "rollup-plugin-node-polyfills/polyfills/qs",
      punycode: "rollup-plugin-node-polyfills/polyfills/punycode",
      url: "rollup-plugin-node-polyfills/polyfills/url",
      // string_decoder: "rollup-plugin-node-polyfills/polyfills/string-decoder",
      http: "rollup-plugin-node-polyfills/polyfills/http",
      https: "rollup-plugin-node-polyfills/polyfills/http",
      os: "rollup-plugin-node-polyfills/polyfills/os",
      assert: "rollup-plugin-node-polyfills/polyfills/assert",
      constants: "rollup-plugin-node-polyfills/polyfills/constants",
      _stream_duplex: "rollup-plugin-node-polyfills/polyfills/readable-stream/duplex",
      _stream_passthrough: "rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough",
      _stream_readable: "rollup-plugin-node-polyfills/polyfills/readable-stream/readable",
      _stream_writable: "rollup-plugin-node-polyfills/polyfills/readable-stream/writable",
      _stream_transform: "rollup-plugin-node-polyfills/polyfills/readable-stream/transform",
      timers: "rollup-plugin-node-polyfills/polyfills/timers",
      console: "rollup-plugin-node-polyfills/polyfills/console",
      vm: "rollup-plugin-node-polyfills/polyfills/vm",
      zlib: "rollup-plugin-node-polyfills/polyfills/zlib",
      tty: "rollup-plugin-node-polyfills/polyfills/tty",
      domain: "rollup-plugin-node-polyfills/polyfills/domain",
      buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6", // add buffer
      process: "rollup-plugin-node-polyfills/polyfills/process-es6", // add process
    },
  },
  // css: {
  //   //预处理css
  //   preprocessorOptions: {
  //     scss: {
  //       //引入全局自定义变量
  //       additionalData: '@import "路径"'
  //     }
  //   }
  // },
  plugins: [
    commonjs(),
    vue(),
    // vitePluginRequireTransform({
    //   fileRegex: /.js$|.ts$/,
    // }),
    // compression(),
    AutoImport({
      resolvers: [VantResolver()],
    }),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
});
