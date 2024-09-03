import { createRouter, createMemoryHistory, RouteRecordRaw, createWebHashHistory } from "vue-router";
const routes: Array<any> = [
  {
    path: '/',
    redirect:'/chart'

  },
  {
    path: '/chart',
    name:'chart',
    component:()=>import('@/views/chart/index.vue'),
    meta:{
      title:'KChart',
      noBack:true
    }
  },
]
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router