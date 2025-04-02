export const asyncSleep = (delay = 200) => new Promise((resolve) => setTimeout(resolve, delay))

const zhVoiceMap = {
  'zh-CN-XiaoxiaoNeural': 'zh-CN-晓晓', // 标准普通话女声
  'zh-CN-XiaoyiNeural': 'zh-CN-晓伊', // 普通话男声
  'zh-CN-YunjianNeural': 'zh-CN-云健', // 普通话男声，剑指坚韧风格
  'zh-CN-YunxiNeural': 'zh-CN-云希', // 普通话男声，温和自然
  'zh-CN-YunxiaNeural': 'zh-CN-云夏', // 普通话女声，清新夏日感
  'zh-CN-YunyangNeural': 'zh-CN-云扬', // 普通话男声，阳刚有力
  'zh-CN-liaoning-XiaobeiNeural': 'zh-CN-辽宁-晓北', // 辽宁方言女声，亲切东北风
  'zh-CN-shaanxi-XiaoniNeural': 'zh-CN-陕西-晓妮', // 陕西方言女声，带秦腔韵味
  'zh-HK-HiuGaaiNeural': 'zh-HK-曉佳', // 粤语女声，优雅港风
  'zh-HK-HiuMaanNeural': 'zh-HK-曉曼', // 粤语女声，温柔细腻
  'zh-HK-WanLungNeural': 'zh-HK-雲龍', // 粤语男声，沉稳有力
  'zh-TW-HsiaoChenNeural': 'zh-TW-曉臻', // 台湾普通话女声，清晨般清新
  'zh-TW-HsiaoYuNeural': 'zh-TW-曉雨', // 台湾普通话女声，柔和优雅
  'zh-TW-YunJheNeural': 'zh-TW-雲哲', // 台湾普通话男声，睿智沉稳
} as const

type VoiceKey = keyof typeof zhVoiceMap

export const mapZHVoiceName = (name: string): string | undefined => {
  if (name in zhVoiceMap) {
    return zhVoiceMap[name as VoiceKey]
  }
  return undefined
}
import { ref, type Ref } from 'vue'
interface AudioController {
  play: () => Promise<void>
  pause: () => void
  toggle: () => void
  destroy: () => void
  isPlaying: Ref<boolean> // 暴露响应式的 isPlaying
}

const audioCache = new Map<string, AudioController>()

export function useAudio(mp3Url: string): AudioController {
  if (audioCache.has(mp3Url)) {
    return audioCache.get(mp3Url)!
  }

  const isPlaying = ref(false) // 使用 ref 使其响应式
  let audio: HTMLAudioElement | null = null

  const initAudio = () => {
    if (!audio) {
      audio = new Audio(mp3Url)
      audio.addEventListener('ended', () => {
        isPlaying.value = false
      })
    }
  }

  const play = async () => {
    initAudio()
    if (audio && !isPlaying.value) {
      await audio.play()
      isPlaying.value = true
    }
  }

  const pause = () => {
    if (audio && isPlaying.value) {
      audio.pause()
      isPlaying.value = false
    }
  }

  const toggle = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  const destroy = () => {
    if (audio) {
      audio.pause()
      audio.removeEventListener('ended', () => {})
      audio = null
      isPlaying.value = false
      audioCache.delete(mp3Url)
    }
  }

  const controller: AudioController = { play, pause, toggle, destroy, isPlaying }
  audioCache.set(mp3Url, controller)
  return controller
}

interface AudioProcessor {
  audioUrl: string // 用于绑定到 <audio> 元素的 src
  appendBuffer: (data: ArrayBuffer) => void // 追加音频数据
  stop: () => void // 停止并清理资源
  isActive: () => boolean // 检查 MediaSource 是否活跃
  getLoadedDuration: () => number // 返回duration
  downloadAudio: () => void // 返回duration
  audioElement: HTMLAudioElement // 音频元素引用
  currentTime: (time: number) => void // 返回duration
  setTime: (time: number) => void // 返回duration
  finished: boolean
}

/**
 * 创建一个基于 MediaSource 的音频流处理器
 * @param stream axios 返回的 ReadableStream
 * @param mimeType 音频流的 MIME 类型，默认为 'audio/mpeg'
 * @returns AudioProcessor 接口
 */

// TODO: 动态缓冲区
export function createAudioStreamProcessor(
  audioElement: HTMLAudioElement, // 用于绑定到 <audio> 元素的 src
  stream: ReadableStream<Uint8Array>,
  onFinished: () => void,
  mimeType: string = 'audio/mpeg',
): AudioProcessor {
  const mediaSource = new MediaSource()
  let sourceBuffer: SourceBuffer | null = null
  let isAppending = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let blobs: { duration: number; blob: Blob }[] = []
  let bitrate = 96_000
  let finished = false

  const audioUrl = URL.createObjectURL(mediaSource)

  mediaSource.addEventListener('sourceopen', async () => {
    if (!mediaSource.sourceBuffers.length) {
      sourceBuffer = mediaSource.addSourceBuffer(mimeType)
      sourceBuffer.mode = 'sequence'

      // 处理缓冲区更新时的事件
      sourceBuffer.addEventListener('updateend', () => {
        isAppending = false
        // 如果流已结束且缓冲区无数据，结束 MediaSource
        if (
          mediaSource.readyState === 'open' &&
          reader === null &&
          sourceBuffer?.buffered.length === 0
        ) {
          mediaSource.endOfStream()
          onFinished()
        }
        if (mediaSource.readyState === 'open') {
          // _cleanUpBuffer()
        }
      })

      await startReadingStream()
    }
  })
  let _cleanUpBuffer = throttle(cleanUpBuffer, 1e3)
  // TODO: 清理缓存
  function cleanUpBuffer() {
    if (!sourceBuffer || sourceBuffer.updating) return

    const buffered = sourceBuffer.buffered
    if (buffered.length === 0) return

    const currentTime = audioElement.currentTime // 当前播放时间
    const maxBufferDuration = 5 // 最大缓存时长前后各1分钟

    const start = buffered.start(0) // 缓存的起始时间
    const end = buffered.end(buffered.length - 1) // 缓存的结束时间

    const startEnd = currentTime - maxBufferDuration
    const endEnd = currentTime + maxBufferDuration

    if (startEnd > start) {
      sourceBuffer.remove(start, startEnd)
      console.log(`清理缓存：移除 ${start} 到 ${startEnd} 的数据`)
    }
    if (endEnd + 5 < end) {
      sourceBuffer.remove(endEnd, end + 5)
      console.log(`清理缓存：移除 ${endEnd} 到 ${end} 的数据`)
    }
  }
  audioElement.addEventListener('seeked', () => {
    const seekTime = audioElement.currentTime // 用户跳转到的时间点
    audioElement.pause()
    loadAroundSeek(seekTime)
  })
  async function loadAroundSeek(seekTime: number) {
    if (sourceBuffer?.buffered.length) {
      const bufferStart = sourceBuffer?.buffered?.start(0)
      const bufferEnd = sourceBuffer?.buffered?.end(sourceBuffer.buffered?.length - 1)
      console.log('当前缓存范围:', bufferStart, bufferEnd)
      console.log('用户跳转到的时间点:', seekTime)
      if (bufferStart !== undefined && bufferEnd) {
        if (seekTime > bufferStart && seekTime < bufferEnd) {
          return
        }
      }
      //TODO:
    }
  }
  // 读取流并追加数据
  async function startReadingStream() {
    reader = stream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          reader = null
          if (!sourceBuffer?.updating && mediaSource.readyState === 'open') {
            mediaSource.endOfStream()
          }
          break
        }
        if (value) {
          await appendBuffer(value.buffer)
          const blob = new Blob([value.buffer], { type: mimeType })
          const blobDuration = (blob.size * 8) / bitrate
          blobs.push({ blob, duration: blobDuration })
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error)
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream('network')
      }
    }
  }

  async function appendBuffer(data: ArrayBuffer): Promise<void> {
    if (!sourceBuffer || mediaSource.readyState !== 'open') {
      return
    }
    if (sourceBuffer.updating || isAppending) {
      await new Promise((resolve) => {
        sourceBuffer!.addEventListener('updateend', resolve, { once: true })
      })
    }

    try {
      isAppending = true
      sourceBuffer.appendBuffer(data)
    } catch (error) {
      console.error('Error appending buffer:', error)
      isAppending = false
    }
  }
  function downloadAudio() {
    // 传输完毕才能下载，只下载部分音频数据会导致duration显示错误，播放错误
    if (blobs.length === 0) {
      console.warn('No audio data to download.')
      return
    }
    // 合并所有 blobs 为一个完整的音频 Blob
    const audioBlob = new Blob(
      blobs.map((b) => b.blob),
      { type: mimeType }
    )
    const url = URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url
    const ext = mimeType.split('/')[1]
    a.download = 'audio.' + (ext === 'mpeg' ? 'mp3' : ext || 'mp3')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const getLoadedDuration = () => {
    const totalDuration = blobs.reduce((acc, blob) => acc + blob.duration, 0)
    return totalDuration
  }
  const stop = () => {
    if (reader) {
      reader.cancel()
      reader = null
    }
    if (mediaSource.readyState === 'open') {
      mediaSource.endOfStream()
    }
    URL.revokeObjectURL(audioUrl)
  }
  const isActive = () => mediaSource.readyState === 'open'
  const currentTime = (time: number) => (audioElement.currentTime = time)
  const setTime = async (seekTime: number) => {
    await loadAroundSeek(seekTime)
    await asyncSleep(100)
    audioElement.currentTime = seekTime
  }

  return {
    audioUrl,
    appendBuffer,
    stop,
    isActive,
    getLoadedDuration,
    downloadAudio,
    audioElement,
    currentTime,
    setTime,
    finished,
  }
}

export const toFixed = (num: number | string, toFixed = 2) => {
  return Number(Number(num).toFixed(toFixed))
}

export const throttle = (fn: () => void, wait: number) => {
  let lastTime = 0
  return function (...args: any) {
    const now = new Date().getTime()
    if (now - lastTime >= wait) {
      fn.apply(args)
      lastTime = now
    }
  }
}
