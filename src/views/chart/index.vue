<template>
  <div :style="{ position: 'relative', width: config.canvas.width, height: config.canvas.height + 'px' }">
    <canvas class="canvasBg" :style="{ backgroundColor: config.bg.bgColor }" :width="config.canvas.width"
      :height="config.canvas.height" ref="canvasBg" id="canvasId"></canvas>
    <canvas class="canvas" :width="config.canvas.width" :height="config.canvas.height" ref="canvas" @click=""></canvas>
    <p class="asideNumber" v-for="item in asideNumber"
      :style="{ bottom: item.height + 'px', backgroundColor: config.bg.bgColor }">{{ item.value }}</p>
    <div v-if="initData.length > 0"
      :style="{ backgroundColor: config.bg.bgColor, top: lastData.y + 'px', right: lastData.x <= config.canvas.width * .8 ? 0 : '50px' }"
      class="lstPrice" @click="reDraw">
      {{ initData[initData.length - 1][4] }}
    </div>
    <div v-show="intersect.isShow" class="dashboard"
      :style="intersect.dir === 'left' ? { right: '20px' } : { left: '20px' }">
      <div style="display: flex;justify-content: space-between;margin-bottom: 3px;" v-for="item in intersect.data">
        <p style="color: #999999;font-size: 10px;margin-right: 10px;">{{ item.title }}</p>
        <p :style="{ fontSize: '10px', color: item.color }">{{ item.before }}{{ item.value }}{{ item.append }}</p>
      </div>
    </div>
  </div>
</template>

<script lang='ts' setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { calculatePriceChangePercentage, fakeData, formatNumber, getDistance, pointDirWithCanvas, setupCanvas } from './util';
import { ChartData, DashboardFormData, MouseEvent } from './index.type';
import dayjs from 'dayjs';

const dpr = window.devicePixelRatio
const config = {
  canvas: {
    width: window.screen.width,
    height: 300,
    dampingFactor: .95, //阻尼系数0-1 越小阻尼越低
  },
  bg: {
    horCount: 5, //背景横线
    verCount: 6, //背景纵线
    text: 'B i t g e t',
    textColor: 'rgba(0, 0, 0, 0.2)',
    fontSize: 30,
    bgColor: 'white'
  },
  k: {
    //上下偏移量
    offset: {
      top: .05,
      bottom: .05
    },
    initKCount: 50, //初始化展示多少根K线
    initWidth: 5,
    maxWidth: 20,
    minWidth: 5,
    color: {
      up: '#03a0aa',
      down: '#ee4639'
    },
    startDistance: 0,
  }
}

const canvas = ref<OffscreenCanvas & HTMLCanvasElement>()
const canvasBg = ref<OffscreenCanvas & HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D>()
const ctxBg = ref<CanvasRenderingContext2D>()
const initData = ref<string[][]>([]) //初始数据
const viewData = ref<ChartData[]>([]) //可视区域数据
const asideNumber = reactive<{ height: number, value: string }[]>([]) //右侧数字数据
// 十字准星
const intersect = ref({
  x: 0,
  y: 0,
  dir: '',
  isShow: false,
  data: [] as DashboardFormData[]
})
const lastData = ref({ x: 0, y: 0 })

// k线配置数据
const kConfig = reactive({
  width: config.k.initWidth,
  draggableX: config.k.initKCount * config.k.initWidth
})

onMounted(() => {
  if (!canvas.value || !canvasBg.value) return
  ctx.value = setupCanvas(canvas.value) 
  ctxBg.value = setupCanvas(canvasBg.value) 
  // 获取数据
  initData.value = fakeData
  drawBg()
  handleK()
  event()
})
// 监听拖动后重绘
watch([kConfig], (value, old) => {
  reDraw()
})
function reDraw() {
  if (!ctx.value) return
  intersect.value.isShow = false
  //@ts-ignore
  ctx.value.reset()
  ctx.value.scale(dpr, dpr) //处理dpr模糊问题
  handleK()
}
// k线数量
const kCount = computed(() => {
  return Math.round(config.canvas.width / kConfig.width)
})
// 事件
function event() {
  if (!canvas.value) return
  let beginX = 0 //开始位置
  let beginT = 0 //开始时间
  let startDistance = 0; //开始的距离
  let startWidth = 0 //开始的k线宽度
  let lastTouch: TouchList | undefined
  let eventType: MouseEvent;
  let timer: any;
  canvas.value.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.targetTouches.length === 1) {
      lastTouch = e.targetTouches
      beginX = e.targetTouches[0].clientX
      beginT = Date.now()
      eventType = 'draggable'
      reDraw()
      
      if (!timer) {
        timer = setTimeout(() => {
          eventType = 'click'
          handleIntersectData(e)
        }, 500);
      }

    }
    if (e.targetTouches.length === 2) {
      const touch1 = e.targetTouches[0];
      const touch2 = e.targetTouches[1];
      lastTouch = e.targetTouches
      startDistance = getDistance(touch1, touch2);
      startWidth = kConfig.width
      eventType = 'scale'
    }
  })
  canvas.value.addEventListener('touchmove', (e: TouchEvent) => {
    if (!lastTouch) return
    e.preventDefault();
    const thisTouch = e.targetTouches
    clearTimeout(timer)
    timer = undefined
    // 单指操作（拖动）
    if (eventType === 'draggable') {
      const isToLeft = lastTouch?.length === 1 && lastTouch[0].clientX < thisTouch[0].clientX //向左滑动
      const isToRight = lastTouch?.length === 1 && lastTouch[0].clientX > thisTouch[0].clientX //向右滑动
      const result = thisTouch[0].clientX - lastTouch[0].clientX
      // 如果超过数据不滑动了
      if (kConfig.draggableX + result >= kConfig.width * initData.value.length && isToLeft || kConfig.draggableX + result <= kConfig.width && isToRight) {
        return lastTouch = e.targetTouches
      }
      kConfig.draggableX += result
      lastTouch = e.targetTouches
    }
    // 双指操作（缩放）
    if (eventType === 'scale') {
      const touch1 = thisTouch[0];
      const touch2 = thisTouch[1];
      const currentDistance = getDistance(touch1, touch2);
      const deltaDistance = currentDistance - startDistance;
      const newScale = 1 + (deltaDistance / startDistance)
      const res = startWidth * newScale
      // 是否在区间范围内
      if ((kConfig.width < config.k.maxWidth && res > kConfig.width || kConfig.width > config.k.minWidth && res < kConfig.width)) {
        kConfig.width = res
      }
    }
    // 十字准星
    if (eventType === 'click') {
      reDraw()
      handleIntersectData(e)
    }
  })
  canvas.value.addEventListener('touchend', (e: TouchEvent) => {
    clearTimeout(timer)
    timer = undefined
    // 处理拖动后的阻尼感
    if (eventType === 'draggable') {
      // 如果超过数据不滑动了
      if (kConfig.draggableX >= kConfig.width * initData.value.length || kConfig.draggableX <= kConfig.width) {
        return lastTouch = e.changedTouches
      }
      e.preventDefault();
      const endX = e.changedTouches[0].clientX
      const endT = Date.now()
      const moveX = endX - beginX;
      const moveT = endT - beginT;
      let speed = moveX / moveT;
      if (Math.abs(speed) < .5) return
      speed = speed * 20 //阻尼移动的速度
      const time:any = setInterval(() => {
        if (Math.abs(speed) <= 0.1) return clearInterval(time)
        if (kConfig.draggableX >= kConfig.width * initData.value.length || kConfig.draggableX + speed <= kConfig.width) return clearInterval(time)
        kConfig.draggableX += speed
        speed *= config.canvas.dampingFactor;
      }, 0);
    }
    if (eventType === 'scale') {
      startDistance = 0
      lastTouch = undefined
      startWidth = 0
    }
  })
}
// 画背景
function drawBg() {
  if (!ctxBg.value) return
  const ctxC = ctxBg.value
  for (let index = 0; index < config.bg.horCount; index++) {
    ctxC.beginPath()
    let height = (config.canvas.height / (config.bg.horCount - 1)) * index
    if (index === 0) {
      height = 1
    }
    if (index === config.bg.horCount - 1) {
      height = config.canvas.height - 1
    }

    ctxC.lineWidth = .1
    ctxC.moveTo(0, height)
    ctxC.lineTo(config.canvas.width, height)
    ctxC.stroke()
    ctxC.closePath()
  }
  for (let index = 0; index < config.bg.verCount; index++) {
    ctxC.beginPath()
    let width = (config.canvas.width / (config.bg.verCount - 1)) * index
    if (index === 0) {
      width = 1
    }
    if (index === config.bg.verCount - 1) {
      width = config.canvas.width - 1
    }
    ctxC.lineWidth = .1
    ctxC.moveTo(width, 0)
    ctxC.lineTo(width, config.canvas.width)
    ctxC.stroke()
    ctxC.closePath()
  }
  var textHeight = config.bg.fontSize;
  ctxC.font = `${textHeight}px Arial`;
  const textW = ctxC.measureText(config.bg.text).width
  ctxC.fillStyle = config.bg.textColor
  ctxC.fillText(config.bg.text, config.canvas.width / 2 - textW / 2, config.canvas.height / 2 + textHeight / 2);
}
// 处理k线数据
async function handleK() {
  if (!initData.value) return
  const startDataCount = initData.value.length - Math.round(kConfig.draggableX / kConfig.width) //计算开始K线下标
  const endDataCount = startDataCount + (Math.round(config.canvas.width / kConfig.width)) //计算结束K线下标=开始+页面K线数量
  const data = initData.value.slice(startDataCount > 0 ? startDataCount : 0, endDataCount)
  // 最高k线
  const maxHeight = data.reduce((pre, cur) => {
    return Math.max(+cur[2], pre)
  }, 0)
  // 最低k线
  const maxLow = data.reduce((pre, cur) => {
    return Math.min(+cur[3], pre)
  }, Infinity)
  // 计算换算比例
  const kChartViewHeight = config.canvas.height * (1 - (config.k.offset.top + config.k.offset.bottom))
  const KChartViewDataHeight = maxHeight - maxLow
  const ratio = kChartViewHeight / KChartViewDataHeight
  // 最新数据
  const lastItem = initData.value[initData.value.length - 1]
  const index = (initData.value.length - 1 - startDataCount) //下标
  const heightMiddle = lastItem[4] > lastItem[1] ? 0 : (Math.max(+lastItem[1], +lastItem[4],) - Math.min(+lastItem[1], +lastItem[4],)) * ratio //柱体
  let y = ((maxHeight - Math.max(+lastItem[1], +lastItem[4],)) * ratio + config.k.offset.top * config.canvas.height) + heightMiddle  //y坐标 + 顶部针 + 是否大于收盘价 ？ 0 : 柱体高度
  if (y > config.canvas.height * (1 - config.k.offset.bottom)) {
    y = config.canvas.height - 9
  }
  if (y < config.canvas.height * config.k.offset.top) {
    y = 9
  }
  lastData.value = {
    x: ((config.canvas.width / kCount.value * index) + index),
    y,
  }
  // 右侧数字
  handleRightNumber(KChartViewDataHeight, maxLow)
  // 计算k线数据
  viewData.value = data.map((item, index) => {
    const heightTop = (+item[2] - Math.max(+item[1], +item[4],)) * ratio //顶部针
    const heightMiddle = (Math.max(+item[1], +item[4],) - Math.min(+item[1], +item[4],)) * ratio //柱体
    const heightBottom = (Math.min(+item[1], +item[4],) - +item[3]) * ratio //下部针
    return {
      x: (config.canvas.width / kCount.value * index) + index,
      y: (maxHeight - Math.max(+item[1], +item[4],)) * ratio + config.k.offset.top * config.canvas.height,
      width: config.canvas.width / kCount.value,
      heightTop,
      heightMiddle,
      heightBottom,
      high: +item[2] * ratio,
      low: +item[3] * ratio,
      close: +item[4] * ratio,
      open: +item[1] * ratio,
      isMax: +item[2] === maxHeight,
      isMin: +item[3] === maxLow,
      data: item
    }
  })
  draw()
}
// 处理右侧数字
function handleRightNumber(KChartViewDataHeight: number, maxLow: number) {
  let realIndex = 0
  for (let index = config.bg.horCount - 1; index >= 0; index--) {
    if (index === 0) {
      asideNumber[0] = {
        height: config.canvas.height - 15,
        value: formatNumber(((config.canvas.height - 15) / (config.canvas.height / KChartViewDataHeight) + maxLow))
      }
    } else if (index === config.bg.horCount - 1) {
      asideNumber[config.bg.horCount - 1] = {
        height: 15,
        value: formatNumber((15 / (config.canvas.height / KChartViewDataHeight) + maxLow))
      }
    } else {
      const h = (config.canvas.height / (config.bg.horCount - 1)) * index
      asideNumber[realIndex] = {
        height: h,
        value: formatNumber((h / (config.canvas.height / KChartViewDataHeight) + maxLow))
      }
    }
    realIndex++
  }
}
// 处理十字准星数据
function handleIntersectData(e: TouchEvent) {
  const touchX = e.targetTouches[0].clientX
  const isOutside = viewData.value.length * (kConfig.width + 1) < touchX
  const item = isOutside ? viewData.value[viewData.value.length - 1] : viewData.value.find(item => item.x - 1 <= touchX && item.x + kConfig.width >= touchX)!

  const x = item.x + kConfig.width / 2
  const y = item.y + item.heightMiddle / 2
  for (const key in item) {
    const element = item[key as keyof ChartData];
    element
  }
  intersect.value = {
    x, y, isShow: true, dir: pointDirWithCanvas(config.canvas.width, x), data: [
      { title: '时间', value: dayjs(+item.data[0]).format('MM-DD HH:mm:ss') },
      { title: '开', value: formatNumber(+item.data[1]) },
      { title: '收', value: formatNumber(+item.data[4]) },
      { title: '高', value: formatNumber(+item.data[2]) },
      { title: '低', value: formatNumber(+item.data[3]) },
      { title: '涨跌幅', value: calculatePriceChangePercentage(+item.data[1], +item.data[4]), color: +calculatePriceChangePercentage(+item.data[1], +item.data[4]) > 0 ? config.k.color.up : config.k.color.down, append: '%', before: +calculatePriceChangePercentage(+item.data[1], +item.data[4]) > 0 ? '+' : '' },
      { title: '涨额', value: (+item.data[4] - +item.data[1]).toFixed(2), color: (+item.data[4] - +item.data[1]) > 0 ? config.k.color.up : config.k.color.down },
      { title: '振幅', value: '' + calculatePriceChangePercentage(+item.data[3], +item.data[2]), append: '%', before: +calculatePriceChangePercentage(+item.data[3], +item.data[2]) > 0 ? "+" : '' },
      { title: '量', value: formatNumber(+item.data[5]) },
      { title: '额', value: formatNumber(+item.data[6] / 10000), append: '万' },
    ]
  }
  drawIntersect()
}
// 画十字准星
function drawIntersect() {
  if (!ctx.value) return
  const ctxC = ctx.value

  ctxC.beginPath();
  ctxC.moveTo(0, intersect.value.y);
  ctxC.lineTo(config.canvas.width, intersect.value.y);
  ctxC.moveTo(intersect.value.x, 0);
  ctxC.lineTo(intersect.value.x, config.canvas.height);
  ctxC.closePath();
  ctxC.lineWidth = 1
  ctxC.strokeStyle = '#6d6c6c'
  ctxC.setLineDash([2, 4])
  ctxC.stroke()
}
// 画k线相关
function draw() {
  if (!viewData.value || !ctx.value) return
  const ctxC = ctx.value
  for (let index = 0; index < viewData.value.length; index++) {
    const item = viewData.value[index];
    ctxC.fillStyle = item.close > item.open ? config.k.color.up : config.k.color.down
    // 处理开盘收盘一样
    if (item.heightMiddle < 1) {
      ctxC.beginPath();
      ctxC.strokeStyle = item.close > item.open ? config.k.color.up : config.k.color.down
      ctxC.moveTo(item.x, item.y);
      ctxC.lineTo(item.x + item.width, item.y);
      ctxC.stroke()
      ctxC.closePath()
    } else {
      // 画带圆角的k线
      const radius = kConfig.width >= 20 ? 2 : 1
      ctxC.beginPath();
      ctxC.moveTo(item.x + radius, item.y);
      ctxC.lineTo(item.x + item.width - radius, item.y);
      ctxC.arcTo(item.x + item.width, item.y, item.x + item.width, item.y + item.heightMiddle, radius);
      ctxC.lineTo(item.x + item.width, item.y + item.heightMiddle - radius);
      ctxC.arcTo(item.x + item.width, item.y + item.heightMiddle, item.x + item.width - radius, item.y + item.heightMiddle, radius);
      ctxC.lineTo(item.x + radius, item.y + item.heightMiddle);
      ctxC.arcTo(item.x, item.y + item.heightMiddle, item.x, item.y + item.heightMiddle - radius, radius);
      ctxC.lineTo(item.x, item.y + radius);
      ctxC.arcTo(item.x, item.y, item.x + radius, item.y, radius);
      ctxC.closePath();
      ctxC.fill()
    }
    // 上下针
    ctxC.rect(item.x + item.width / 2, item.y - item.heightTop, 1, item.heightTop) //上部针
    ctxC.rect(item.x + item.width / 2, item.y + item.heightMiddle, 1, item.heightBottom) //下部针
    ctxC.fill()
    // 是最高点，需要展示数字
    if (item.isMax) {
      const beginY = item.y - item.heightTop
      const beginX = item.x + item.width / 2
      const dir = pointDirWithCanvas(config.canvas.width, beginX)
      const move = dir === 'left' ? 20 : -20
      ctxC.beginPath();
      ctxC.moveTo(beginX, beginY)
      ctxC.lineTo(beginX + move, beginY)
      ctxC.lineWidth = .5
      ctxC.strokeStyle = '#6d6c6c'
      ctxC.closePath();
      ctxC.stroke()
      // 画数值
      ctxC.fillStyle = '#6d6c6c'
      ctxC.font = '10px Arial'
      const text = formatNumber(+item.data[2])
      const textW = ctxC.measureText(text).width
      const moveT = dir === 'left' ? 5 : -textW - 5
      ctxC.fillText(formatNumber(+item.data[2]), beginX + move + moveT, beginY + 5)
    }
    // 是最低点，需要展示数字
    if (item.isMin) {
      const beginY = item.y + item.heightMiddle + item.heightBottom
      const beginX = item.x + item.width / 2
      const dir = pointDirWithCanvas(config.canvas.width - kCount.value, beginX)
      const move = dir === 'left' ? 20 : -20
      ctxC.beginPath();
      ctxC.moveTo(beginX, beginY)
      ctxC.lineTo(beginX + move, beginY)
      ctxC.lineWidth = .5
      ctxC.strokeStyle = '#6d6c6c'
      ctxC.closePath();
      ctxC.stroke()
      // 画数值
      ctxC.fillStyle = '#6d6c6c'
      ctxC.font = '10px Arial'
      const text = formatNumber(+item.data[2])
      const textW = ctxC.measureText(text).width
      const moveT = dir === 'left' ? 5 : -textW - 5
      ctxC.fillText(formatNumber(+item.data[2]), beginX + move + moveT, beginY + 5)
    }
  }
  // 画最新数据的虚线
  ctxC.beginPath();
  let y =lastData.value.y
  if (lastData.value.x <= config.canvas.width * .8) {
    ctxC.moveTo(lastData.value.x + kConfig.width, y);
    ctxC.lineTo(config.canvas.width, y);
  } else {
    ctxC.moveTo(0, y);
    ctxC.lineTo(config.canvas.width, y);
  }
  ctxC.lineWidth = 1
  ctxC.strokeStyle = '#6d6c6c'
  ctxC.setLineDash([2, 4])
  ctxC.closePath();
  ctxC.stroke()
}
</script>

<style lang='scss' scoped>
* {
  -webkit-touch-callout: none;
  /* iOS Safari */
  -webkit-user-select: none;
  /* Safari */
  -khtml-user-select: none;
  /* Konqueror HTML */
  -moz-user-select: none;
  /* Firefox */
  -ms-user-select: none;
  /* Internet Explorer/Edge */
  user-select: none;
}

.canvas {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 3;
}

.canvasBg {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 1;
}

.asideNumber {
  position: absolute;
  right: 1px;
  font-size: 10px;
  transform: translateY(50%);
  padding: 0 5px;
  z-index: 2;
  color: #999999;
}

.lstPrice {
  position: absolute;

  padding: 0 5px;
  height: 18px;
  line-height: 17px;
  border: 1px solid black;
  border-radius: 3px;
  color: black;
  z-index: 4;
  font-size: 10px;
  transform: translateY(-50%);
}

.dashboard {
  padding: 3px;
  background-color: rgba(238, 238, 238, 0.765);
  border-radius: 3px;
  position: absolute;
  z-index: 5;
  top: 10px;
}
</style>