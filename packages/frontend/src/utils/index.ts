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
  appendData: (data: ArrayBuffer) => void // 追加音频数据
  stop: () => void // 停止并清理资源
  isActive: () => boolean // 检查 MediaSource 是否活跃
}

/**
 * 创建一个基于 MediaSource 的音频流处理器
 * @param stream axios 返回的 ReadableStream
 * @param mimeType 音频流的 MIME 类型，默认为 'audio/mpeg'
 * @returns AudioProcessor 接口
 */

// TODO: 动态缓冲区
export function createAudioStreamProcessor(
  stream: ReadableStream<Uint8Array>,
  mimeType: string = 'audio/mpeg'
): AudioProcessor {
  const mediaSource = new MediaSource()
  let sourceBuffer: SourceBuffer | null = null
  let isAppending = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let blobs: Blob[] = []

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
        }
      })

      await startReadingStream()
    }
  })

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
          blobs.push(new Blob([value.buffer]))
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error)
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream('network')
      }
    }
  }

  // 追加数据到 SourceBuffer
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

  // 返回接口
  return {
    audioUrl,
    appendData: appendBuffer,
    stop: () => {
      if (reader) {
        reader.cancel()
        reader = null
      }
      if (mediaSource.readyState === 'open') {
        mediaSource.endOfStream()
      }
      URL.revokeObjectURL(audioUrl)
    },
    isActive: () => mediaSource.readyState === 'open',
  }
}
