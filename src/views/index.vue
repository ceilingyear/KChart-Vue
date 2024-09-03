<template>
  <div class="body">
    <img class="logo" src="@/assets/logo.png" alt="">
    <h1 class="title">是否已有钱包？</h1>
    <Row style="margin-top: 20px;">
      <van-button @click="go('/import')">导入钱包</van-button>
      <van-button style="margin-left: 10px;" type="primary" @click="go('/create')">创建钱包</van-button>
    </Row>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter()

//跳转
function go(path: string) {
  router.push(path)
}

</script>

<style lang="scss" scoped>
.body {
  display: flex;
  /* justify-content: center; */
  align-items: center;
  flex-direction: column;
}

@keyframes loginAni {
  0% {
    transform: rotate(0deg) translateY(0px);
  }

  100% {
    transform: rotate(15deg) translateY(15px);
  }
}

.logo {
  width: 100px;
  animation: 3s linear 0s infinite alternate loginAni;
  margin-top: 100px;
}

.title {
  margin-top: 60px;
}
</style>
