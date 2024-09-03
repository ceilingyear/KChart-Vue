<template>
  <div class="nav" >
    <div style="width: 30px;height: 30px;">
      <img :hidden="!!route.meta.noBack" style="width: 30px;height: 30px;" src="@/assets/back.png" @click="router.back()">
    </div>
    <p v-show="route.meta.title" style="font-weight: 500;">{{ route.meta.title }}</p>
    <div style="width: 30px;height: 30px;"></div>
  </div>
  <router-view />
  
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';

const route = useRoute()
const router = useRouter()

</script>

<style scoped>
.nav{
  padding: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
