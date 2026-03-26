<template>
  <div class="letter-drawer">
    <canvas ref="canvasRef" width="800" height="600"></canvas>
    <div class="controls">
      <select v-model="currentLetter">
        <option v-for="letter in letters" :key="letter" :value="letter">
          {{ letter }}
        </option>
      </select>

      <button @click="startDrawing" :disabled="isDrawing && !isPaused">
        {{ isDrawing ? '重新开始' : '开始绘制' }}
      </button>

      <button @click="togglePause" :disabled="!isDrawing">
        {{ isPaused ? '继续' : '暂停' }}
      </button>

      <button @click="reset">重置</button>

      <label>
        速度:
        <input v-model.number="speed" type="range" min="1" max="100" />
        {{ speed }}
      </label>

      <label>
        <input v-model="showGuide" type="checkbox" />
        显示引导线
      </label>

      <span class="status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'

const canvasRef = ref(null)
const speed = ref(30)
const currentLetter = ref('A')
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const isDrawing = ref(false)
const isPaused = ref(false)
const showGuide = ref(true)
let animationController = null

const statusText = computed(() => {
  if (!isDrawing.value) return '未开始'
  if (isPaused.value) return '已暂停'
  return '绘制中...'
})

// 手动定义每个字母的笔画顺序（按照正确的书写顺序）
const letterStrokes = {
  A: [
    // 笔画1: 左斜线（从上到下）
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 右斜线（从上到下）
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'L', x: 350, y: 400 },
    ],
    // 笔画3: 横线（从左到右）
    [
      { type: 'M', x: 180, y: 280 },
      { type: 'L', x: 320, y: 280 },
    ],
  ],
  B: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上半圆
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'Q', x1: 320, y1: 100, x: 320, y: 180 },
      { type: 'Q', x1: 320, y1: 250, x: 150, y: 250 },
    ],
    // 笔画3: 下半圆
    [
      { type: 'M', x: 150, y: 250 },
      { type: 'Q', x1: 340, y1: 250, x: 340, y: 325 },
      { type: 'Q', x1: 340, y1: 400, x: 150, y: 400 },
    ],
  ],
  C: [
    // 一笔画完C（从右上开始，逆时针）
    [
      { type: 'M', x: 340, y: 150 },
      { type: 'Q', x1: 320, y1: 100, x: 250, y: 100 },
      { type: 'Q', x1: 150, y1: 100, x: 150, y: 250 },
      { type: 'Q', x1: 150, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 320, y1: 400, x: 340, y: 350 },
    ],
  ],
  D: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 右侧圆弧
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'Q', x1: 350, y1: 100, x: 350, y: 250 },
      { type: 'Q', x1: 350, y1: 400, x: 150, y: 400 },
    ],
  ],
  E: [
    // 笔画1: 竖线（从上到下）
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上横线（从左到右）
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 330, y: 100 },
    ],
    // 笔画3: 中横线（从左到右）
    [
      { type: 'M', x: 150, y: 250 },
      { type: 'L', x: 310, y: 250 },
    ],
    // 笔画4: 下横线（从左到右）
    [
      { type: 'M', x: 150, y: 400 },
      { type: 'L', x: 330, y: 400 },
    ],
  ],
  F: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上横线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 330, y: 100 },
    ],
    // 笔画3: 中横线
    [
      { type: 'M', x: 150, y: 250 },
      { type: 'L', x: 310, y: 250 },
    ],
  ],
  G: [
    // 笔画1: 外圆弧（从右上开始）
    [
      { type: 'M', x: 340, y: 150 },
      { type: 'Q', x1: 320, y1: 100, x: 250, y: 100 },
      { type: 'Q', x1: 150, y1: 100, x: 150, y: 250 },
      { type: 'Q', x1: 150, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 340, y1: 400, x: 340, y: 280 },
    ],
    // 笔画2: 横线
    [
      { type: 'M', x: 250, y: 280 },
      { type: 'L', x: 340, y: 280 },
    ],
  ],
  H: [
    // 笔画1: 左竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 右竖线
    [
      { type: 'M', x: 330, y: 100 },
      { type: 'L', x: 330, y: 400 },
    ],
    // 笔画3: 横线
    [
      { type: 'M', x: 150, y: 250 },
      { type: 'L', x: 330, y: 250 },
    ],
  ],
  I: [
    // 笔画1: 上横线
    [
      { type: 'M', x: 180, y: 100 },
      { type: 'L', x: 320, y: 100 },
    ],
    // 笔画2: 中竖线
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'L', x: 250, y: 400 },
    ],
    // 笔画3: 下横线
    [
      { type: 'M', x: 180, y: 400 },
      { type: 'L', x: 320, y: 400 },
    ],
  ],
  J: [
    // 笔画1: 竖线和弧线
    [
      { type: 'M', x: 300, y: 100 },
      { type: 'L', x: 300, y: 350 },
      { type: 'Q', x1: 300, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 150, y1: 400, x: 150, y: 350 },
    ],
  ],
  K: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上斜线
    [
      { type: 'M', x: 330, y: 100 },
      { type: 'L', x: 150, y: 250 },
    ],
    // 笔画3: 下斜线
    [
      { type: 'M', x: 150, y: 250 },
      { type: 'L', x: 330, y: 400 },
    ],
  ],
  L: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 横线
    [
      { type: 'M', x: 150, y: 400 },
      { type: 'L', x: 330, y: 400 },
    ],
  ],
  M: [
    // 笔画1: 左竖线
    [
      { type: 'M', x: 120, y: 400 },
      { type: 'L', x: 120, y: 100 },
    ],
    // 笔画2: 左斜线到中间
    [
      { type: 'M', x: 120, y: 100 },
      { type: 'L', x: 250, y: 250 },
    ],
    // 笔画3: 右斜线向上
    [
      { type: 'M', x: 250, y: 250 },
      { type: 'L', x: 380, y: 100 },
    ],
    // 笔画4: 右竖线
    [
      { type: 'M', x: 380, y: 100 },
      { type: 'L', x: 380, y: 400 },
    ],
  ],
  N: [
    // 笔画1: 左竖线
    [
      { type: 'M', x: 140, y: 400 },
      { type: 'L', x: 140, y: 100 },
    ],
    // 笔画2: 斜线
    [
      { type: 'M', x: 140, y: 100 },
      { type: 'L', x: 340, y: 400 },
    ],
    // 笔画3: 右竖线
    [
      { type: 'M', x: 340, y: 400 },
      { type: 'L', x: 340, y: 100 },
    ],
  ],
  O: [
    // 一笔画完整个O
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'Q', x1: 370, y1: 100, x: 370, y: 250 },
      { type: 'Q', x1: 370, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 130, y1: 400, x: 130, y: 250 },
      { type: 'Q', x1: 130, y1: 100, x: 250, y: 100 },
    ],
  ],
  P: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上半圆
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'Q', x1: 330, y1: 100, x: 330, y: 180 },
      { type: 'Q', x1: 330, y1: 250, x: 150, y: 250 },
    ],
  ],
  Q: [
    // 笔画1: 圆圈
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'Q', x1: 370, y1: 100, x: 370, y: 240 },
      { type: 'Q', x1: 370, y1: 380, x: 250, y: 380 },
      { type: 'Q', x1: 130, y1: 380, x: 130, y: 240 },
      { type: 'Q', x1: 130, y1: 100, x: 250, y: 100 },
    ],
    // 笔画2: 右下斜线
    [
      { type: 'M', x: 320, y: 320 },
      { type: 'L', x: 370, y: 420 },
    ],
  ],
  R: [
    // 笔画1: 竖线
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'L', x: 150, y: 400 },
    ],
    // 笔画2: 上半圆
    [
      { type: 'M', x: 150, y: 100 },
      { type: 'Q', x1: 330, y1: 100, x: 330, y: 180 },
      { type: 'Q', x1: 330, y1: 250, x: 150, y: 250 },
    ],
    // 笔画3: 右下斜线
    [
      { type: 'M', x: 220, y: 250 },
      { type: 'L', x: 330, y: 400 },
    ],
  ],
  S: [
    // 一笔画S形
    [
      { type: 'M', x: 330, y: 130 },
      { type: 'Q', x1: 310, y1: 100, x: 250, y: 100 },
      { type: 'Q', x1: 150, y1: 100, x: 150, y: 160 },
      { type: 'Q', x1: 150, y1: 200, x: 250, y: 220 },
      { type: 'Q', x1: 330, y1: 240, x: 330, y: 280 },
      { type: 'Q', x1: 330, y1: 340, x: 250, y: 340 },
      { type: 'Q', x1: 330, y1: 340, x: 330, y: 340 },
      { type: 'Q', x1: 350, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 170, y1: 400, x: 150, y: 370 },
    ],
  ],
  T: [
    // 笔画1: 上横线
    [
      { type: 'M', x: 130, y: 100 },
      { type: 'L', x: 370, y: 100 },
    ],
    // 笔画2: 中竖线
    [
      { type: 'M', x: 250, y: 100 },
      { type: 'L', x: 250, y: 400 },
    ],
  ],
  U: [
    // 一笔画U形
    [
      { type: 'M', x: 140, y: 100 },
      { type: 'L', x: 140, y: 330 },
      { type: 'Q', x1: 140, y1: 400, x: 250, y: 400 },
      { type: 'Q', x1: 360, y1: 400, x: 360, y: 330 },
      { type: 'L', x: 360, y: 100 },
    ],
  ],
  V: [
    // 笔画1: 左斜线
    [
      { type: 'M', x: 130, y: 100 },
      { type: 'L', x: 250, y: 400 },
    ],
    // 笔画2: 右斜线
    [
      { type: 'M', x: 250, y: 400 },
      { type: 'L', x: 370, y: 100 },
    ],
  ],
  W: [
    // 笔画1: 第一笔斜下
    [
      { type: 'M', x: 100, y: 100 },
      { type: 'L', x: 170, y: 400 },
    ],
    // 笔画2: 第二笔斜上
    [
      { type: 'M', x: 170, y: 400 },
      { type: 'L', x: 250, y: 200 },
    ],
    // 笔画3: 第三笔斜下
    [
      { type: 'M', x: 250, y: 200 },
      { type: 'L', x: 330, y: 400 },
    ],
    // 笔画4: 第四笔斜上
    [
      { type: 'M', x: 330, y: 400 },
      { type: 'L', x: 400, y: 100 },
    ],
  ],
  X: [
    // 笔画1: 左上到右下
    [
      { type: 'M', x: 140, y: 100 },
      { type: 'L', x: 340, y: 400 },
    ],
    // 笔画2: 右上到左下
    [
      { type: 'M', x: 340, y: 100 },
      { type: 'L', x: 140, y: 400 },
    ],
  ],
  Y: [
    // 笔画1: 左上到中心
    [
      { type: 'M', x: 130, y: 100 },
      { type: 'L', x: 250, y: 250 },
    ],
    // 笔画2: 右上到中心
    [
      { type: 'M', x: 370, y: 100 },
      { type: 'L', x: 250, y: 250 },
    ],
    // 笔画3: 中心向下
    [
      { type: 'M', x: 250, y: 250 },
      { type: 'L', x: 250, y: 400 },
    ],
  ],
  Z: [
    // 笔画1: 上横线
    [
      { type: 'M', x: 140, y: 100 },
      { type: 'L', x: 360, y: 100 },
    ],
    // 笔画2: 斜线
    [
      { type: 'M', x: 360, y: 100 },
      { type: 'L', x: 140, y: 400 },
    ],
    // 笔画3: 下横线
    [
      { type: 'M', x: 140, y: 400 },
      { type: 'L', x: 360, y: 400 },
    ],
  ],
}

// 监听字母变化，显示引导线
watch(currentLetter, () => {
  if (!isDrawing.value && showGuide.value) {
    drawGuide()
  }
})

watch(showGuide, () => {
  if (!isDrawing.value) {
    if (showGuide.value) {
      drawGuide()
    } else {
      reset()
    }
  }
})

onMounted(() => {
  if (showGuide.value) {
    drawGuide()
  }
})

const drawGuide = () => {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const strokes = letterStrokes[currentLetter.value]
  if (!strokes) return

  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  strokes.forEach((stroke) => {
    ctx.beginPath()
    stroke.forEach((cmd) => {
      if (cmd.type === 'M') {
        ctx.moveTo(cmd.x, cmd.y)
      } else if (cmd.type === 'L') {
        ctx.lineTo(cmd.x, cmd.y)
      } else if (cmd.type === 'Q') {
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
      } else if (cmd.type === 'C') {
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
      }
    })
    ctx.stroke()
  })
}

const startDrawing = async () => {
  if (animationController) {
    animationController.stop()
  }
  reset()
  isDrawing.value = true
  isPaused.value = false
  await drawLetter(currentLetter.value)
  isDrawing.value = false
}

const togglePause = () => {
  if (!isDrawing.value) return
  isPaused.value = !isPaused.value
  if (animationController) {
    if (isPaused.value) {
      animationController.pause()
    } else {
      animationController.resume()
    }
  }
}

const reset = () => {
  if (animationController) {
    animationController.stop()
  }
  isDrawing.value = false
  isPaused.value = false
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  }
}

const drawLetter = async (letter) => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const strokes = letterStrokes[letter]
  if (!strokes) {
    console.warn(`字母 ${letter} 未定义笔画`)
    return
  }

  // 逐笔画绘制
  for (let i = 0; i < strokes.length; i++) {
    await animateStroke(ctx, strokes[i], i)
    // 笔画之间稍作停顿
    await sleep(200)
  }
}

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const animateStroke = (ctx, stroke, strokeIndex) => {
  return new Promise((resolve) => {
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    let progress = 0
    let isActive = true
    let animationId = null
    let lastPoint = null

    animationController = {
      pause: () => {
        isActive = false
      },
      resume: () => {
        isActive = true
        animate()
      },
      stop: () => {
        isActive = false
        if (animationId) cancelAnimationFrame(animationId)
        resolve()
      },
    }

    // 计算笔画的总长度
    const totalLength = calculateStrokeLength(stroke)

    const animate = () => {
      if (!isActive) return

      if (progress >= 1) {
        resolve()
        return
      }

      // 根据速度增加进度
      const increment = (speed.value / 1000) * (5 / totalLength)
      progress += increment
      if (progress > 1) progress = 1

      // 绘制到当前进度
      drawStrokeProgress(ctx, stroke, progress)

      animationId = requestAnimationFrame(animate)
    }

    animate()
  })
}

const calculateStrokeLength = (stroke) => {
  let length = 0
  let lastPoint = null

  stroke.forEach((cmd) => {
    if (cmd.type === 'M') {
      lastPoint = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'L' && lastPoint) {
      const dx = cmd.x - lastPoint.x
      const dy = cmd.y - lastPoint.y
      length += Math.sqrt(dx * dx + dy * dy)
      lastPoint = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'Q' && lastPoint) {
      // 二次贝塞尔曲线的近似长度
      length += approximateCurveLength(
        lastPoint.x,
        lastPoint.y,
        cmd.x1,
        cmd.y1,
        cmd.x,
        cmd.y,
        'Q',
      )
      lastPoint = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'C' && lastPoint) {
      // 三次贝塞尔曲线的近似长度
      length += approximateCurveLength(
        lastPoint.x,
        lastPoint.y,
        cmd.x1,
        cmd.y1,
        cmd.x2,
        cmd.y2,
        cmd.x,
        cmd.y,
        'C',
      )
      lastPoint = { x: cmd.x, y: cmd.y }
    }
  })

  return length || 1
}

const approximateCurveLength = (x0, y0, x1, y1, x2, y2, x3, y3, type) => {
  // 使用简单的分段近似
  let length = 0
  const segments = 10
  let lastX = x0
  let lastY = y0

  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    let x, y

    if (type === 'Q') {
      // 二次贝塞尔
      x = Math.pow(1 - t, 2) * x0 + 2 * (1 - t) * t * x1 + Math.pow(t, 2) * x2
      y = Math.pow(1 - t, 2) * y0 + 2 * (1 - t) * t * y1 + Math.pow(t, 2) * y2
    } else {
      // 三次贝塞尔
      x =
        Math.pow(1 - t, 3) * x0 +
        3 * Math.pow(1 - t, 2) * t * x1 +
        3 * (1 - t) * Math.pow(t, 2) * x2 +
        Math.pow(t, 3) * x3
      y =
        Math.pow(1 - t, 3) * y0 +
        3 * Math.pow(1 - t, 2) * t * y1 +
        3 * (1 - t) * Math.pow(t, 2) * y2 +
        Math.pow(t, 3) * y3
    }

    const dx = x - lastX
    const dy = y - lastY
    length += Math.sqrt(dx * dx + dy * dy)
    lastX = x
    lastY = y
  }

  return length
}

const drawStrokeProgress = (ctx, stroke, progress) => {
  ctx.beginPath()

  let currentLength = 0
  const totalLength = calculateStrokeLength(stroke)
  const targetLength = totalLength * progress
  let lastPoint = null
  let drawn = false

  for (let i = 0; i < stroke.length && !drawn; i++) {
    const cmd = stroke[i]

    if (cmd.type === 'M') {
      ctx.moveTo(cmd.x, cmd.y)
      lastPoint = { x: cmd.x, y: cmd.y }
    } else if (cmd.type === 'L' && lastPoint) {
      const dx = cmd.x - lastPoint.x
      const dy = cmd.y - lastPoint.y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)

      if (currentLength + segmentLength <= targetLength) {
        // 完整绘制这一段
        ctx.lineTo(cmd.x, cmd.y)
        currentLength += segmentLength
        lastPoint = { x: cmd.x, y: cmd.y }
      } else {
        // 部分绘制
        const remaining = targetLength - currentLength
        const ratio = remaining / segmentLength
        const x = lastPoint.x + dx * ratio
        const y = lastPoint.y + dy * ratio
        ctx.lineTo(x, y)
        drawn = true
      }
    } else if (cmd.type === 'Q' && lastPoint) {
      const curveLength = approximateCurveLength(
        lastPoint.x,
        lastPoint.y,
        cmd.x1,
        cmd.y1,
        cmd.x,
        cmd.y,
        null,
        null,
        'Q',
      )

      if (currentLength + curveLength <= targetLength) {
        // 完整绘制曲线
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
        currentLength += curveLength
        lastPoint = { x: cmd.x, y: cmd.y }
      } else {
        // 部分绘制曲线
        const remaining = targetLength - currentLength
        const ratio = remaining / curveLength
        drawPartialQuadraticCurve(
          ctx,
          lastPoint.x,
          lastPoint.y,
          cmd.x1,
          cmd.y1,
          cmd.x,
          cmd.y,
          ratio,
        )
        drawn = true
      }
    } else if (cmd.type === 'C' && lastPoint) {
      const curveLength = approximateCurveLength(
        lastPoint.x,
        lastPoint.y,
        cmd.x1,
        cmd.y1,
        cmd.x2,
        cmd.y2,
        cmd.x,
        cmd.y,
        'C',
      )

      if (currentLength + curveLength <= targetLength) {
        // 完整绘制曲线
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
        currentLength += curveLength
        lastPoint = { x: cmd.x, y: cmd.y }
      } else {
        // 部分绘制曲线
        const remaining = targetLength - currentLength
        const ratio = remaining / curveLength
        drawPartialBezierCurve(
          ctx,
          lastPoint.x,
          lastPoint.y,
          cmd.x1,
          cmd.y1,
          cmd.x2,
          cmd.y2,
          cmd.x,
          cmd.y,
          ratio,
        )
        drawn = true
      }
    }
  }

  ctx.stroke()
}

const drawPartialQuadraticCurve = (ctx, x0, y0, x1, y1, x2, y2, ratio) => {
  // 使用分段绘制部分曲线
  const segments = Math.ceil(ratio * 20)
  for (let i = 1; i <= segments; i++) {
    const t = (i / 20) * ratio
    const x =
      Math.pow(1 - t, 2) * x0 + 2 * (1 - t) * t * x1 + Math.pow(t, 2) * x2
    const y =
      Math.pow(1 - t, 2) * y0 + 2 * (1 - t) * t * y1 + Math.pow(t, 2) * y2
    ctx.lineTo(x, y)
  }
}

const drawPartialBezierCurve = (ctx, x0, y0, x1, y1, x2, y2, x3, y3, ratio) => {
  // 使用分段绘制部分曲线
  const segments = Math.ceil(ratio * 20)
  for (let i = 1; i <= segments; i++) {
    const t = (i / 20) * ratio
    const x =
      Math.pow(1 - t, 3) * x0 +
      3 * Math.pow(1 - t, 2) * t * x1 +
      3 * (1 - t) * Math.pow(t, 2) * x2 +
      Math.pow(t, 3) * x3
    const y =
      Math.pow(1 - t, 3) * y0 +
      3 * Math.pow(1 - t, 2) * t * y1 +
      3 * (1 - t) * Math.pow(t, 2) * y2 +
      Math.pow(t, 3) * y3
    ctx.lineTo(x, y)
  }
}
</script>

<style scoped>
.letter-drawer {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

canvas {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  display: block;
  background: white;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
}

button {
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 14px;
}

button:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

select {
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

select:hover {
  border-color: #2563eb;
}

select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

input[type='range'] {
  width: 120px;
  cursor: pointer;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.status {
  padding: 6px 14px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  border: 1px solid #e5e7eb;
}
</style>
