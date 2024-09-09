// import './polyfill'
import { createApp } from 'vue'
import './style/index.css'
import App from './App.vue'
import router from "./router";
// const loc = 'http://127.0.0.1:8545/'
const app = createApp(App)
app.use(router).mount('#app')
