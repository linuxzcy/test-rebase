<template>
  <div class="letter-drawing">
    <div class="canvas-container">
      <svg width="400" height="400" viewBox="0 0 400 400" ref="svgRef">
        <path
          ref="pathRef"
          :d="currentPath"
          fill="none"
          stroke="#333"
          stroke-width="8"
          stroke-linecap="round"
          stroke-linejoin="round"
          :style="pathStyle"
        />
      </svg>
    </div>

    <div class="controls">
      <div class="letter-selector">
        <label>选择字母:</label>
        <select v-model="selectedLetter" @change="reset">
          <option v-for="letter in letters" :key="letter">{{ letter }}</option>
        </select>
      </div>

      <div class="speed-control">
        <label>绘制速度: {{ speed }}s</label>
        <input
          type="range"
          v-model.number="speed"
          min="0.5"
          max="5"
          step="0.5"
        />
      </div>

      <div class="buttons">
        <button @click="start" :disabled="isDrawing && !isPaused">开始</button>
        <button @click="pause" :disabled="!isDrawing || isPaused">暂停</button>
        <button @click="resume" :disabled="!isPaused">继续</button>
        <button @click="reset">重置</button>
      </div>
    </div>

    <div class="info">
      当前字母: <strong>{{ selectedLetter }}</strong> | 进度:
      <strong>{{ progress }}%</strong> | 状态: <strong>{{ status }}</strong>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const selectedLetter = ref('A')
const speed = ref(2)
const isDrawing = ref(false)
const isPaused = ref(false)
const drawProgress = ref(0)

const svgRef = ref(null)
const pathRef = ref(null)

// 字母路径数据 (简化版，实际可以更复杂)
const letterPaths = {
  A: 'M 100 300 L 200 100 L 300 300 M 150 225 L 250 225',
  B: 'M 100 100 L 100 300 L 250 300 Q 300 250 250 200 Q 300 150 250 100 L 100 100 M 100 200 L 250 200',
  C: 'M 300 150 Q 300 100 250 100 L 150 100 Q 100 100 100 150 L 100 250 Q 100 300 150 300 L 250 300 Q 300 300 300 250',
  D: 'M 100 100 L 100 300 L 200 300 Q 300 250 300 200 Q 300 150 200 100 Z',
  E: 'M 300 100 L 100 100 L 100 300 L 300 300 M 100 200 L 250 200',
  F: 'M 100 300 L 100 100 L 300 100 M 100 200 L 250 200',
  G: 'M 300 150 Q 300 100 250 100 L 150 100 Q 100 100 100 150 L 100 250 Q 100 300 150 300 L 250 300 L 250 200 L 200 200',
  H: 'M 100 100 L 100 300 M 300 100 L 300 300 M 100 200 L 300 200',
  I: 'M 200 100 L 200 300 M 150 100 L 250 100 M 150 300 L 250 300',
  J: 'M 250 100 L 250 250 Q 250 300 200 300 L 150 300 Q 100 300 100 250',
  K: 'M 100 100 L 100 300 M 300 100 L 100 200 L 300 300',
  L: 'M 100 100 L 100 300 L 300 300',
  M: 'M 100 300 L 100 100 L 200 200 L 300 100 L 300 300',
  N: 'M 100 300 L 100 100 L 300 300 L 300 100',
  O: 'M 200 100 Q 100 100 100 200 Q 100 300 200 300 Q 300 300 300 200 Q 300 100 200 100 Z',
  P: 'M 100 300 L 100 100 L 250 100 Q 300 100 300 150 Q 300 200 250 200 L 100 200',
  Q: 'M 200 100 Q 100 100 100 200 Q 100 300 200 300 Q 300 300 300 200 Q 300 100 200 100 M 250 250 L 320 320',
  R: 'M 100 300 L 100 100 L 250 100 Q 300 100 300 150 Q 300 200 250 200 L 100 200 M 200 200 L 300 300',
  S: 'M 300 150 Q 300 100 250 100 L 150 100 Q 100 100 100 150 Q 100 200 200 200 Q 300 200 300 250 Q 300 300 250 300 L 150 300 Q 100 300 100 250',
  T: 'M 100 100 L 300 100 M 200 100 L 200 300',
  U: 'M 100 100 L 100 250 Q 100 300 150 300 L 250 300 Q 300 300 300 250 L 300 100',
  V: 'M 100 100 L 200 300 L 300 100',
  W: 'M 100 100 L 125 300 L 200 150 L 275 300 L 300 100',
  X: 'M 100 100 L 300 300 M 300 100 L 100 300',
  Y: 'M 100 100 L 200 200 L 300 100 M 200 200 L 200 300',
  Z: 'M 100 100 L 300 100 L 100 300 L 300 300',
}

const currentPath = computed(() => letterPaths[selectedLetter.value] || '')

const pathStyle = computed(() => {
  if (!pathRef.value) return {}

  const pathLength = getPathLength()
  const dashOffset = pathLength * (1 - drawProgress.value / 100)

  return {
    strokeDasharray: pathLength,
    strokeDashoffset: dashOffset,
    transition:
      isDrawing.value && !isPaused.value
        ? `stroke-dashoffset ${speed.value}s linear`
        : 'none',
  }
})

const progress = computed(() => Math.round(drawProgress.value))

const status = computed(() => {
  if (!isDrawing.value) return '未开始'
  if (isPaused.value) return '已暂停'
  if (drawProgress.value >= 100) return '已完成'
  return '绘制中'
})

let animationId = null
let startTime = null
let pausedTime = 0
let totalPausedDuration = 0

const getPathLength = () => {
  if (!pathRef.value) return 0
  return pathRef.value.getTotalLength()
}

const start = () => {
  reset()
  isDrawing.value = true
  isPaused.value = false
  startTime = performance.now()
  totalPausedDuration = 0
  animate()
}

const pause = () => {
  if (!isDrawing.value || isPaused.value) return
  isPaused.value = true
  pausedTime = performance.now()
  cancelAnimationFrame(animationId)
}

const resume = () => {
  if (!isPaused.value) return
  isPaused.value = false
  totalPausedDuration += performance.now() - pausedTime
  animate()
}

const reset = () => {
  cancelAnimationFrame(animationId)
  isDrawing.value = false
  isPaused.value = false
  drawProgress.value = 0
  startTime = null
  pausedTime = 0
  totalPausedDuration = 0
}

const animate = () => {
  if (isPaused.value) return

  const currentTime = performance.now()
  const elapsed = currentTime - startTime - totalPausedDuration
  const duration = speed.value * 1000

  drawProgress.value = Math.min((elapsed / duration) * 100, 100)

  if (drawProgress.value < 100) {
    animationId = requestAnimationFrame(animate)
  } else {
    isDrawing.value = false
    drawProgress.value = 100
  }
}

// 监听速度变化，如果正在绘制则重新开始
watch(speed, () => {
  if (isDrawing.value && !isPaused.value) {
    const currentProgress = drawProgress.value
    reset()
    isDrawing.value = true
    drawProgress.value = currentProgress
    startTime = performance.now() - (currentProgress / 100) * speed.value * 1000
    totalPausedDuration = 0
    animate()
  }
})
</script>

<style scoped>
.letter-drawing {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.canvas-container {
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

svg {
  background: white;
  border-radius: 4px;
}

.controls {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.letter-selector,
.speed-control {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

select,
input[type='range'] {
  width: 100%;
  padding: 8px;
  font-size: 16px;
}

input[type='range'] {
  padding: 0;
}

.buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  flex: 1;
  min-width: 100px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.info {
  text-align: center;
  font-size: 16px;
  padding: 15px;
  background: #e3f2fd;
  border-radius: 6px;
  color: #1976d2;
}

.info strong {
  color: #0d47a1;
}
</style>
