<template>
  <div class="tts-audio-player">
    <audio ref="audioRef" @timeupdate="updateProgress" @loadedmetadata="updateDuration">
      你的浏览器不支持音频播放。
    </audio>
    <div class="controls">
      <el-button :type="isPlaying ? 'warning' : 'primary'" circle @click="toggle">
        <el-icon v-if="!isPlaying"><VideoPlay /></el-icon>
        <el-icon v-else><VideoPause /></el-icon>
      </el-button>
      <el-button type="danger" circle @click="stop">
        <el-icon><RefreshLeft /></el-icon>
      </el-button>
    </div>
    <div class="progress-container">
      <el-slider
        v-model="progress"
        :max="100"
        :show-tooltip="false"
        @change="seek"
        @input="input"
        class="progress-slider"
      />
    </div>
    <div class="time-display">
      <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElButton, ElSlider } from 'element-plus'
import { VideoPlay, VideoPause, RefreshLeft } from '@element-plus/icons-vue'
import type { Arrayable } from 'element-plus/es/utils/index.mjs'
import { debounce } from '@/utils'
interface Prop {
  duration: number
}
const props = defineProps<Prop>()
// 定义响应式变量
const audioRef = ref<HTMLAudioElement | null>(null)
const progress = ref(0) // 播放进度（百分比）
const currentTime = ref(0) // 当前播放时间（秒）
const isPlaying = ref(false)

const toggle = () => {
  if (isPlaying.value) {
    pause().then(() => (isPlaying.value = false))
  } else {
    play().then(() => (isPlaying.value = true))
  }
}
// 播放音频
const play = async () => audioRef.value!.play()

// 暂停音频
const pause = async () => audioRef.value!.pause()

// 停止音频并重置进度
const stop = () => {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
    progress.value = 0
    currentTime.value = 0
  }
}

// 更新播放进度
const updateProgress = (event: Event) => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
    progress.value = (currentTime.value / props.duration) * 100
  }
}

// 更新音频时长（从元数据加载时触发）
const updateDuration = () => {
  if (audioRef.value) {
    // props.duration = audioRef.value.duration
  }
}

// 拖动进度条时调整播放位置

const seek = (value: Arrayable<number>) => {
  if (Array.isArray(value)) return
  if (audioRef.value) {
    audioRef.value.currentTime = (value / 100) * props.duration
  }
}
const input = debounce((value: Arrayable<number>) => {
  if (Array.isArray(value)) return
  if (audioRef.value) {
    audioRef.value.currentTime = (value / 100) * props.duration
  }
}, 100)

// 格式化时间（分钟:秒）
const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}
defineExpose({
  audioRef,
})
</script>

<style scoped>
.tts-audio-player {
  margin: 10px auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  width: 300px;
  transition: all 0.3s ease;
}

.tts-audio-player:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.el-button {
  font-size: 18px;
  padding: 10px;
  transition: transform 0.2s ease;
}

.el-button:hover {
  transform: scale(1.1);
}

.progress-container {
  width: 100%;
  padding: 0 10px;
  margin-bottom: 10px;
}

.progress-slider {
  width: 100%;
}

.time-display {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.7);
  padding: 5px 10px;
  border-radius: 20px;
}
</style>
