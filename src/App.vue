<template>
  <div class="nav">
    <div style="width: 30px;height: 30px;">
    </div>
    <p v-show="route.meta.title" style="font-weight: 500;">{{ route.meta.title }}</p>
    <div style="width: 30px;height: 30px;"></div>
  </div>
  <Chart :config="config" :data="fakeData" :onEnd="{
    offsetNumber: 20,
    fn: (e) => {
      console.log('触发了end事件');
    }
  }" />
  <p style="margin-top: 20px;font-size: 12px;">ps：pc端用户请点击F12切换设备为移动端（切换为设备仿真）</p>
  <img src="@/assets/tip.jpg" alt="">
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import Chart from './views/chart/index.vue'
import { fakeData } from './views/chart/util';
import { KChartConfigType } from './views/chart/index.type';

const route = useRoute()
const router = useRouter()
const config: KChartConfigType = {
  canvas: {
    width: window.screen.width,
    height: 300,
    dampingFactor: .95, //阻尼系数0-1 越小阻尼越低
    top: 50
  },
  k: {
    margin: 1,
    initKCount:50
  }
}


</script>

<style scoped>
.nav {
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
