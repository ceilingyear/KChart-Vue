import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path"; //引入的重置指向

/** @type {import('vite').UserConfig} */
export default defineConfig({
  server: {
    base:'http://localhost:3001/',
    // host:'192.168.110.97',
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
    },
  },
  resolve: {
    alias: {
      //制订别名规则
      "@": path.resolve(__dirname, "./src"), //用于配置‘@’重定向为当前目录下的src目录
      com: path.resolve(__dirname, "./src/components"), //用于配置‘com’重定向为当前目录下的src/components目录
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
    vue(),
  ],
});
