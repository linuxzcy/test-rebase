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

      <span class="status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import opentype from 'opentype.js'

const canvasRef = ref(null)
const speed = ref(20) // 降低默认速度，让效果更明显
const currentLetter = ref('A')
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const isDrawing = ref(false)
const isPaused = ref(false)
let font = null
let animationController = null

const statusText = computed(() => {
  if (!isDrawing.value) return '未开始'
  if (isPaused.value) return '已暂停'
  return '绘制中...'
})

onMounted(async () => {
  try {
    // 从 public/fonts 目录加载字体
    font = await opentype.load('/fonts/Roboto-Regular.ttf')
    console.log('字体加载成功')
  } catch (error) {
    console.error('字体加载失败:', error)
  }
})

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
  if (!font || !canvasRef.value) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')

  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 获取字母路径
  const fontSize = 300
  const path = font.getPath(letter, 250, 450, fontSize)

  // 动画绘制
  await animatePathDrawing(ctx, path)
}

const animatePathDrawing = (ctx, path) => {
  return new Promise((resolve) => {
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const commands = path.commands
    let commandIndex = 0
    let segmentProgress = 0
    let lastPoint = { x: 0, y: 0 }
    let isActive = true
    let animationId = null

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

    const drawSegment = (cmd, progress) => {
      if (cmd.type === 'M') {
        ctx.beginPath()
        ctx.moveTo(cmd.x, cmd.y)
        lastPoint = { x: cmd.x, y: cmd.y }
      } else if (cmd.type === 'L') {
        // 逐步绘制直线
        const x = lastPoint.x + (cmd.x - lastPoint.x) * progress
        const y = lastPoint.y + (cmd.y - lastPoint.y) * progress
        ctx.lineTo(x, y)
        ctx.stroke()

        if (progress >= 1) {
          lastPoint = { x: cmd.x, y: cmd.y }
        }
      } else if (cmd.type === 'C') {
        // 逐步绘制三次贝塞尔曲线
        const t = progress
        const x =
          Math.pow(1 - t, 3) * lastPoint.x +
          3 * Math.pow(1 - t, 2) * t * cmd.x1 +
          3 * (1 - t) * Math.pow(t, 2) * cmd.x2 +
          Math.pow(t, 3) * cmd.x
        const y =
          Math.pow(1 - t, 3) * lastPoint.y +
          3 * Math.pow(1 - t, 2) * t * cmd.y1 +
          3 * (1 - t) * Math.pow(t, 2) * cmd.y2 +
          Math.pow(t, 3) * cmd.y
        ctx.lineTo(x, y)
        ctx.stroke()

        if (progress >= 1) {
          lastPoint = { x: cmd.x, y: cmd.y }
        }
      } else if (cmd.type === 'Q') {
        // 逐步绘制二次贝塞尔曲线
        const t = progress
        const x =
          Math.pow(1 - t, 2) * lastPoint.x +
          2 * (1 - t) * t * cmd.x1 +
          Math.pow(t, 2) * cmd.x
        const y =
          Math.pow(1 - t, 2) * lastPoint.y +
          2 * (1 - t) * t * cmd.y1 +
          Math.pow(t, 2) * cmd.y
        ctx.lineTo(x, y)
        ctx.stroke()

        if (progress >= 1) {
          lastPoint = { x: cmd.x, y: cmd.y }
        }
      } else if (cmd.type === 'Z') {
        ctx.closePath()
      }
    }

    const animate = () => {
      if (!isActive) {
        return
      }

      if (commandIndex >= commands.length) {
        isDrawing.value = false
        resolve()
        return
      }

      const cmd = commands[commandIndex]

      // 根据速度调整增量（速度越大，增量越大，绘制越快）
      const increment = speed.value / 1000
      segmentProgress += increment

      if (segmentProgress >= 1) {
        segmentProgress = 1
      }

      drawSegment(cmd, segmentProgress)

      if (segmentProgress >= 1) {
        segmentProgress = 0
        commandIndex++
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()
  })
}
</script>

<style scoped>
.letter-drawer {
  padding: 20px;
}

canvas {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  display: block;
  background: white;
}

.controls {
  margin-top: 20px;
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

button {
  padding: 8px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #1d4ed8;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

select {
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
}

label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status {
  padding: 4px 12px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 14px;
  color: #6b7280;
}
</style>
