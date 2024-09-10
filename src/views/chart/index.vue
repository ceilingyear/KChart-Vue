<template>
  <div
    :style="{ position: 'relative', width: config.canvas.width, height: config.canvas.height + 'px', cursor: isMobile ? 'default' : 'crosshair' }">
    <canvas class="canvasBg" :style="{ backgroundColor: config.bg.bgColor }" :width="config.canvas.width"
      :height="config.canvas.height" ref="canvasBg" id="canvasId"></canvas>
    <canvas class="canvas" :width="config.canvas.width" :height="config.canvas.height" ref="canvas" @click=""></canvas>
    <p class="asideNumber" v-for="item in asideNumber"
      :style="{ bottom: item.height + 'px', backgroundColor: config.bg.bgColor }">{{ item.value }}</p>
    <div v-if="initData.length > 0"
      :style="{ backgroundColor: config.bg.bgColor, top: lastData.y + 'px', right: lastData.x <= config.canvas.width * .8 ? '1px' : '50px' }"
      class="lstPrice" @click="reDraw">
      {{ initData[initData.length - 1][4] }}
    </div>
    <div v-show="intersect.isShow"
      :style="{ top: intersect.y - 15 < 0 ? '16px' : intersect.y + 15 > config.canvas.height ? config.canvas.height - 1 : intersect.y + 'px', }"
      class="checkPrice" @click="reDraw">
      <p style="font-size: 10px;line-height: 10px;margin-bottom: 5px;">{{ intersect.price }}</p>
      <p style="font-size: 10px;line-height: 10px;text-align: right;">{{ intersect.amplitude }}</p>
    </div>
    <div v-show="intersect.isShow"
      :style="{ left: intersect.x - 45 < 0 ? 45 : intersect.x + 45 > config.canvas.width ? config.canvas.width : intersect.x + 'px', }"
      class="checkTime" @click="reDraw">
      <p style="font-size: 10px;line-height: 10px;">{{ intersect.data[0]?.value }}</p>
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
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { calculatePriceChangePercentage, formatNumber, getDistance, isMobileDevice, pointDirWithCanvas, setupCanvas } from './util';
import { ChartData, KChartConfigType, DashboardFormData, MouseEvent } from './index.type';
import dayjs from 'dayjs';

const dpr = window.devicePixelRatio
const isMobile = isMobileDevice()
const props = defineProps<{
  config: KChartConfigType,
  data: string[][],
  onEnd?: {
    offsetNumber?: number,
    fn: (e: TouchEvent | globalThis.MouseEvent) => void
  }
}>()
const config = {
  canvas: props.config.canvas,
  bg: {
    horCount: props.config.bg?.horCount || 5, //背景横线
    verCount: props.config.bg?.verCount || 6, //背景纵线
    text: props.config.bg?.text,
    textColor: props.config.bg?.textColor || 'rgba(0, 0, 0, 0.2)',
    fontSize: props.config.bg?.fontSize || 30,
    bgColor: props.config.bg?.bgColor || 'white'
  },
  k: {
    //上下偏移量
    offset: {
      top: props.config.k?.offset?.top || .05,
      bottom: props.config.k?.offset?.bottom || .05
    },
    initKCount: props.config.k?.initKCount || 50, //初始化展示多少根K线
    initWidth: props.config.k?.initWidth || 5,
    maxWidth: props.config.k?.maxWidth || 20,
    minWidth: props.config.k?.minWidth || 3,
    color: {
      up: props.config.k?.color?.up || '#03a0aa',
      down: props.config.k?.color?.down || '#ee4639'
    },
    margin: props.config.k?.margin || 1,
  },
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
  price: '',
  amplitude: '',
  isShow: false,
  data: [] as DashboardFormData[]
})
const lastData = ref({ x: 0, y: 0 })

// k线配置数据
const kConfig = reactive({
  width: config.k.initWidth,
  draggableX: config.k.initKCount * (config.k.initWidth + 1),
  ratio: 0 //换算价格和高度比例（减去了偏移量）
})

onMounted(() => {
  if (!canvas.value || !canvasBg.value) return
  ctx.value = setupCanvas(canvas.value)
  ctxBg.value = setupCanvas(canvasBg.value)
  // 获取数据
  initData.value = props.data
  drawBg()
  handleK()
  if (isMobile) {
    mobileEvent()
  } else {
    webEvent()
  }
})
onUnmounted(() => {
  removeEvent()
})
// 监听拖动后重绘
watch([kConfig], (value, old) => {
  reDraw()
})
// 重绘
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
  return Math.round(config.canvas.width / (kConfig.width + config.k.margin))
})
// 移动端事件
function mobileEvent() {
  if (!canvas.value) return
  let beginX = 0 //开始位置
  let beginT = 0 //开始时间
  let startDistance = 0; //开始的距离
  let startWidth = 0 //开始的k线宽度
  let startMargin = 0 //开始的k线margin
  let lastTouch: TouchList | undefined
  let eventType: MouseEvent;
  let timer: any;
  let timer2: any;
  canvas.value.addEventListener('touchstart', (e: TouchEvent) => {
    if (timer2) {
      clearInterval(timer2)
    }
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
        }, 300);
      }
    }
    if (e.targetTouches.length === 2) {
      const touch1 = e.targetTouches[0];
      const touch2 = e.targetTouches[1];
      lastTouch = e.targetTouches
      startDistance = getDistance(touch1, touch2);
      startWidth = kConfig.width
      startMargin = config.k.margin
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
      const offsetNumber = props.onEnd?.offsetNumber || 0
      // 加载事件
      if (kConfig.draggableX + result >= ((kConfig.width + config.k.margin) * (initData.value.length - offsetNumber)) && isToLeft) {
        props.onEnd?.fn(e)
      }
      // 如果超过数据不滑动了
      if (kConfig.draggableX + result >= (kConfig.width + config.k.margin) * initData.value.length && isToLeft ) {
        kConfig.draggableX = (kConfig.width + config.k.margin) * initData.value.length
        return lastTouch = e.targetTouches
      }
      if ( kConfig.draggableX + result <=(kConfig.width + config.k.margin) && isToRight) {
        kConfig.draggableX = (kConfig.width + config.k.margin)
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
      const res2 = startMargin * newScale
      // 是否在区间范围内
      if ((kConfig.width < config.k.maxWidth && res > kConfig.width || kConfig.width > config.k.minWidth && res < kConfig.width)) {
        kConfig.width = res
        config.k.margin = res2
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
      if (kConfig.draggableX >= (kConfig.width + config.k.margin) * initData.value.length || kConfig.draggableX <= (kConfig.width + config.k.margin)) {
        return lastTouch = e.targetTouches
      }
      e.preventDefault();
      const endX = e.changedTouches[0].clientX
      const endT = Date.now()
      const moveX = endX - beginX;
      const moveT = endT - beginT;
      let speed = moveX / moveT;
      if (Math.abs(speed) < .5) return
      speed = speed * 20 //阻尼移动的速度
      timer2= setInterval(() => {
        if (Math.abs(speed) <= 0.1) return clearInterval(timer2)
        if (kConfig.draggableX + speed >= (kConfig.width + config.k.margin) * initData.value.length || kConfig.draggableX + speed <= (kConfig.width + config.k.margin)) return clearInterval(timer2)
        kConfig.draggableX += speed
        speed *= config.canvas.dampingFactor;
      }, 0);
    }
    if (eventType === 'scale') {
      startDistance = 0
      lastTouch = undefined
      startWidth = 0
      startMargin = 0
    }
  })
}
// web事件
function webEvent() {
  if (!canvas.value) return
  let beginX = 0 //开始位置
  let beginT = 0 //开始时间
  let lastTouch: globalThis.MouseEvent | undefined
  let eventType: MouseEvent;
  let timer: any;
  canvas.value.onmousemove = (e: globalThis.MouseEvent) => {
    reDraw()
    handleIntersectData(e)
  }
  canvas.value.onmouseout = (e: globalThis.MouseEvent) => {
    reDraw()
  }
  canvas.value.onmousedown = (e: globalThis.MouseEvent) => {
    lastTouch = e
    beginX = e.clientX
    beginT = Date.now()
    eventType = 'draggable'
    if (timer) {
        clearInterval(timer)
        timer = undefined
        return
      }
    canvas.value!.onmousemove = (e: globalThis.MouseEvent) => {
      if (!lastTouch) {
        lastTouch = e
      }
      const thisTouch = e

      const isToLeft = lastTouch.clientX < thisTouch.clientX //向左滑动
      const isToRight = lastTouch.clientX > thisTouch.clientX //向右滑动
      const result = thisTouch.clientX - lastTouch.clientX
      const offsetNumber = props.onEnd?.offsetNumber || 0
      // 加载事件
      if (kConfig.draggableX + result >= ((kConfig.width + config.k.margin) * (initData.value.length - offsetNumber)) && isToLeft) {
        props.onEnd?.fn(e)
      }
      // 如果超过数据不滑动了
      if (kConfig.draggableX + result >= (kConfig.width + config.k.margin) * initData.value.length && isToLeft) {
        kConfig.draggableX = (kConfig.width + config.k.margin) * initData.value.length
        return lastTouch = e
      }
      if (kConfig.draggableX + result <= (kConfig.width + config.k.margin) && isToRight) {
        kConfig.draggableX = (kConfig.width + config.k.margin)
        return lastTouch = e
      }
      kConfig.draggableX += result
      lastTouch = e
    }
    canvas.value!.onmouseup = (e: globalThis.MouseEvent) => {
      canvas.value!.onmousemove = null

      // 处理拖动后的阻尼感
      // 如果超过数据不滑动了
      if (kConfig.draggableX >= (kConfig.width + config.k.margin) * initData.value.length || kConfig.draggableX <= (kConfig.width + config.k.margin)) {
        return lastTouch = e
      }
      e.preventDefault();
      const endX = e.clientX
      const endT = Date.now()
      const moveX = endX - beginX;
      const moveT = endT - beginT;
      let speed = moveX / moveT;
      if (Math.abs(speed) < .5) {
        canvas.value!.onmousemove = (e: globalThis.MouseEvent) => {
          reDraw()
          handleIntersectData(e)
        }
        return
      }
      speed = speed * 10 //阻尼移动的速度
      timer = setInterval(() => {
        if (Math.abs(speed) <= 0.1) {
          clearInterval(timer)
          timer = null
          canvas.value!.onmousemove = (e: globalThis.MouseEvent) => {
            reDraw()
            handleIntersectData(e)
          }
          return
        }
        if (kConfig.draggableX + speed >= (kConfig.width + config.k.margin) * initData.value.length || kConfig.draggableX + speed <= (kConfig.width + config.k.margin)) return clearInterval(timer)
        kConfig.draggableX += speed
        speed *= config.canvas.dampingFactor;
      }, 0);
    }
  }
  // 缩放
  window.onkeydown = (e) => {
    if (!canvas.value) return
    if (e.key === 'Meta') {
      canvas.value.onwheel = (e: any) => {
        if (e.wheelDeltaY > 0 && kConfig.width + 1 <= config.k.maxWidth) {
          kConfig.width++
          config.k.margin += .1
        }
        if (e.wheelDeltaY < 0 && kConfig.width - 1 >= config.k.minWidth) {
          kConfig.width--
          config.k.margin -= .1
        }
      }
    }
  }
  window.onkeyup = e => {
    if (!canvas.value) return
    canvas.value.onwheel = null
  }
}
function removeEvent() {
  if (!canvas.value) return
  canvas.value.ontouchstart = null;
  canvas.value.ontouchmove = null;
  canvas.value.ontouchend = null;
  canvas.value.onmousemove = null;
  canvas.value.onmousedown = null;
  canvas.value.onmouseup = null;
  canvas.value.onwheel = null;
  window.onkeydown = null;
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
  if (!config.bg.text) return
  var textHeight = config.bg.fontSize;
  ctxC.font = `${textHeight}px Arial`;
  const textW = ctxC.measureText(config.bg.text).width
  ctxC.fillStyle = config.bg.textColor
  ctxC.fillText(config.bg.text, config.canvas.width / 2 - textW / 2, config.canvas.height / 2 + textHeight / 2);
}
// 处理k线数据
async function handleK() {
  if (!initData.value) return
  let startDataCount = initData.value.length - Math.floor(kConfig.draggableX / (kConfig.width + config.k.margin)) - 1//计算开始K线下标
  startDataCount = startDataCount > 0 ? startDataCount : 0
  const endDataCount = kConfig.draggableX / (kConfig.width + config.k.margin) > kCount.value ? startDataCount + Math.round(config.canvas.width / (kConfig.width + config.k.margin)) + 1 : initData.value.length //计算结束K线下标=开始+页面K线数量
  const data = initData.value.slice(startDataCount, endDataCount)
  // 最高k线
  const maxHigh = data.reduce((pre, cur) => {
    return Math.max(+cur[2], pre)
  }, 0)
  // 最低k线
  const maxLow = data.reduce((pre, cur) => {
    return Math.min(+cur[3], pre)
  }, Infinity)
  // 计算换算比例
  const kChartViewHeight = config.canvas.height * (1 - (config.k.offset.top + config.k.offset.bottom))
  const KChartViewDataHeight = maxHigh - maxLow
  const ratio = kChartViewHeight / KChartViewDataHeight
  // 最新数据
  const lastItem = initData.value[initData.value.length - 1]
  const index = (initData.value.length - 1 - startDataCount) //下标
  const heightMiddle = lastItem[4] > lastItem[1] ? 0 : (Math.max(+lastItem[1], +lastItem[4],) - Math.min(+lastItem[1], +lastItem[4],)) * ratio //柱体
  let y = ((maxHigh - Math.max(+lastItem[1], +lastItem[4],)) * ratio + config.k.offset.top * config.canvas.height) + heightMiddle  //y坐标 + 顶部针 + 是否大于收盘价 ？ 0 : 柱体高度
  if (y > config.canvas.height * (1 - config.k.offset.bottom)) {
    y = config.canvas.height - 9
  }
  if (y < config.canvas.height * config.k.offset.top) {
    y = 9
  }
  lastData.value = {
    x: (kConfig.width + config.k.margin) * index,
    y,
  }
  kConfig.ratio = ratio
  // 右侧数字
  handleRightNumber(ratio, maxLow, maxHigh)
  // 计算k线数据
  viewData.value = data.map((item, index) => {
    const heightTop = (+item[2] - Math.max(+item[1], +item[4],)) * ratio //顶部针
    const heightMiddle = (Math.max(+item[1], +item[4],) - Math.min(+item[1], +item[4],)) * ratio //柱体
    const heightBottom = (Math.min(+item[1], +item[4],) - +item[3]) * ratio //下部针
    let x = (kConfig.width * index) + index * config.k.margin //原始x坐标

    return {
      x: startDataCount === 0 ? x : x + ((kConfig.draggableX % (kConfig.width + config.k.margin)) - (kConfig.width + config.k.margin)),
      y: (maxHigh - Math.max(+item[1], +item[4],)) * ratio + config.k.offset.top * config.canvas.height,
      width: kConfig.width,
      heightTop,
      heightMiddle,
      heightBottom,
      high: +item[2] * ratio,
      low: +item[3] * ratio,
      close: +item[4] * ratio,
      open: +item[1] * ratio,
      isMax: +item[2] === maxHigh,
      isMin: +item[3] === maxLow,
      data: item
    }
  })
  draw()
}
// 处理右侧数字
function handleRightNumber(ratio: number, maxLow: number, maxHigh: number) {
  let realIndex = 0
  const topH = config.canvas.height * config.k.offset.top
  const maxHighH = topH / ratio
  const bottomH = config.canvas.height * config.k.offset.bottom
  const maxLowH = bottomH / ratio
  const fullRatio = (maxHigh + maxHighH - (maxLow - maxLowH)) / config.canvas.height //每px=多少价格

  const offset = 15 //上下偏移量
  const textHOffset = 6 //偏移文字对齐横线
  for (let index = 0; index < config.bg.horCount; index++) {
    if (index === 0) {
      asideNumber[0] = {
        height: config.canvas.height - offset - textHOffset,
        value: formatNumber(maxHigh + maxHighH)
      }
    } else if (index === config.bg.horCount - 1) {
      asideNumber[config.bg.horCount - 1] = {
        height: offset - textHOffset,
        value: formatNumber(maxLow - maxLowH)
      }
    } else {
      const h = (config.canvas.height / (config.bg.horCount - 1)) * index - textHOffset
      asideNumber[index] = {
        height: h,
        value: formatNumber(((h + textHOffset) * fullRatio + maxLow - maxLowH))
      }
    }
    realIndex++
  }
}
// 处理十字准星数据
function handleIntersectData(e: any) {
  // 最高k线
  const maxHigh = viewData.value.reduce((pre, cur) => {
    return Math.max(+cur.data[2], pre)
  }, 0)
  // 最低k线
  const maxLow = viewData.value.reduce((pre, cur) => {
    return Math.min(+cur.data[3], pre)
  }, Infinity)
  const topH = config.canvas.height * config.k.offset.top
  const maxHighH = topH / kConfig.ratio
  const bottomH = config.canvas.height * config.k.offset.bottom
  const maxLowH = bottomH / kConfig.ratio
  const maxH = maxHigh + maxHighH //最高价格
  const maxL = maxLow - maxLowH //最低价格
  const ratio = (maxH - maxL) / config.canvas.height //每px=多少价格

  const touchX = isMobile ? e.targetTouches[0].clientX : e.clientX
  // const isOutside = viewData.value.length * (kConfig.width + config.k.margin) < touchX
  const item = viewData.value.find(item => item.x <= touchX && item.x + kConfig.width + config.k.margin >= touchX) || viewData.value[viewData.value.length - 1]
  // console.log(item,isOutside,touchX, viewData.value[ viewData.value.length - 1]);

  const x = item.x + kConfig.width / 2 - .5
  const y = isMobile ? e.targetTouches[0].clientY - config.canvas.top : e.clientY - config.canvas.top //-上部tab的高度

  if (y < 0 || y > config.canvas.height) return //超出范围
  const curPrice = ((config.canvas.height - y) * ratio) + maxL
  const lastPrice = (+initData.value[initData.value.length - 1][4])
  const amplitude = ((curPrice - lastPrice) / lastPrice * 100).toFixed(2)

  const data = [
    { title: '时间', value: dayjs(+item.data[0]).format('MM-DD HH:mm:ss') },
    { title: '开', value: formatNumber(+item.data[1]) },
    { title: '收', value: formatNumber(+item.data[4]) },
    { title: '高', value: formatNumber(+item.data[2]) },
    { title: '低', value: formatNumber(+item.data[3]) },
    { title: '涨跌幅', value: calculatePriceChangePercentage(+item.data[1], +item.data[4]), color: +calculatePriceChangePercentage(+item.data[1], +item.data[4]) > 0 ? config.k.color.up : config.k.color.down, append: '%', before: +calculatePriceChangePercentage(+item.data[1], +item.data[4]) > 0 ? '+' : '' },
    { title: '涨额', value: (+item.data[4] - +item.data[1]).toFixed(2), color: (+item.data[4] - +item.data[1]) > 0 ? config.k.color.up : config.k.color.down },
    { title: '振幅', value: '' + calculatePriceChangePercentage(+item.data[3], +item.data[2]), append: '%', before: +calculatePriceChangePercentage(+item.data[3], +item.data[2]) > 0 ? "+" : '' },
    { title: '量', value: formatNumber(+item.data[5] / 10000), append: '万' },
    { title: '额', value: formatNumber(+item.data[6] / 10000), append: '万' },
  ]

  intersect.value = {
    x, y, isShow: true, dir: pointDirWithCanvas(config.canvas.width, x), data, price: formatNumber(curPrice), amplitude: (+amplitude > 0 ? '+' : '') + amplitude + '%'
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
    // const x = item.x + config.k.margin
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
      // 优化缩放极小时
      if (kConfig.width < 2) {
        ctxC.strokeStyle = item.close > item.open ? config.k.color.up : config.k.color.down
        ctxC.lineWidth = kConfig.width
        ctxC.beginPath();
        ctxC.moveTo(item.x, item.y);
        ctxC.lineTo(item.x, item.y + item.heightMiddle);
        ctxC.closePath();
        ctxC.stroke()
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

    }
    let width = 1
    if (kConfig.width < 10) {
      width = .7
    }
    if (kConfig.width < 2) {
      width = .4
      item.width = 0
    }
    // 上下针
    ctxC.rect(item.x + item.width / 2 - width / 2, item.y - item.heightTop, width, item.heightTop) //上部针
    ctxC.rect(item.x + item.width / 2 - width / 2, item.y + item.heightMiddle, width, item.heightBottom) //下部针

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
      ctxC.fillText(formatNumber(+item.data[3]), beginX + move + moveT, beginY + 5)
    }
  }
  // 画最新数据的虚线
  ctxC.beginPath();
  let y = lastData.value.y

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
  /* transform: translateY(50%); */
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

.checkPrice {
  position: absolute;
  height: 30px;
  padding: 3px 7px;
  right: 1px;
  line-height: 17px;
  border-radius: 3px;
  background-color: black;
  color: white;
  z-index: 4;
  font-size: 10px;
  transform: translateY(-50%);
}

.checkTime {
  position: absolute;
  width: 90px;
  text-align: center;
  padding: 3px 7px;
  bottom: 0;
  border-radius: 3px;
  background-color: black;
  color: white;
  z-index: 4;
  font-size: 10px;
  transform: translateX(-50%);
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