import * as buffer from "buffer"; //引入buffer
export default (function() {
  if (typeof window.Buffer === "undefined") { // 判断当前环境是否有Buffer对象
    window.Buffer = buffer.Buffer; // Buffer对象不存在则创建导入的buffer
 }
 if (typeof window.global === 'undefined') {
   window.global = window
 }
})()