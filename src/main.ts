// import './polyfill'
import { createApp } from 'vue'
import './style/index.css'
import App from './App.vue'
import router from "./router";
import {store} from "./store/index";
// const loc = 'http://127.0.0.1:8545/'
const app = createApp(App)
app.use(router).use(store).mount('#app')
