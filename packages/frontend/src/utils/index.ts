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
  mimeType: string = 'audio/mpeg'
): AudioProcessor {
  const mediaSource = new MediaSource()
  let sourceBuffer: SourceBuffer | null = null
  let seekingAppend = false
  let isAppending = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let blobs: { duration: number; blob: Blob }[] = []
  let bitrate = 96_000

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
        if (mediaSource.readyState === 'open') {
          // _cleanUpBuffer()
        }
      })

      await startReadingStream()
    }
  })
  let _cleanUpBuffer = throttle(cleanUpBuffer, 1e3)
  // 清理缓存函数
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
  function combineBuffers(buffers: ArrayBuffer[]) {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
      result.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }
    return result.buffer
  }
  async function setBufferRange(
    sourceBuffer: SourceBuffer,
    startTime: number,
    endTime: number,
    mediaData: ArrayBuffer
  ) {
    // 1. 移除当前缓冲区外的范围
    // if (sourceBuffer.buffered.length > 0) {
    //   const currentStart = sourceBuffer.buffered.start(0)
    //   const currentEnd = sourceBuffer.buffered.end(0)
    //   if (currentStart < startTime || currentEnd > endTime) {
    //     sourceBuffer.remove(currentStart, currentEnd)
    //     await new Promise((resolve) =>
    //       sourceBuffer.addEventListener('updateend', resolve, { once: true })
    //     )
    //   }
    // }

    // 2. 设置时间戳偏移
    if (sourceBuffer.updating) {
      await new Promise((resolve) =>
        sourceBuffer.addEventListener('updateend', resolve, { once: true })
      )
    }
    sourceBuffer.timestampOffset = startTime

    // 3. 追加目标数据
    sourceBuffer.appendBuffer(mediaData) // mediaData 为 80-90 秒数据
    await waitUpdating()
  }
  const waitUpdating = async () =>
    new Promise((resolve) => sourceBuffer!.addEventListener('updateend', resolve, { once: true }))
  async function clearSourceBuffer(sourceBuffer: SourceBuffer) {
    if (!(sourceBuffer instanceof SourceBuffer)) {
      console.error('参数必须是一个 SourceBuffer 对象')
      return
    }
    const buffered = sourceBuffer.buffered
    if (buffered.length === 0) {
      console.log('缓冲区已为空，无需清空')
      return
    }
    try {
      for (let i = 0; i < buffered.length; i++) {
        const start = buffered.start(i)
        const end = buffered.end(i)
        await new Promise((resolve) => {
          if (!sourceBuffer.updating) {
            sourceBuffer.remove(start, end)
          }
          sourceBuffer.addEventListener('updateend', resolve, { once: true })
        })
      }
      console.log('所有缓冲区已清空')
    } catch (error) {
      console.error('清空缓冲区时出错:', error)
    }
  }
  async function loadAroundSeek(seekTime: number) {
    if (sourceBuffer?.buffered.length) {
      const bufferStart = sourceBuffer?.buffered?.start(0)
      const bufferEnd = sourceBuffer?.buffered?.end(sourceBuffer.buffered?.length - 1)
      console.log('当前缓存范围:', bufferStart, bufferEnd)
      console.log('用户跳转到的时间点:', seekTime)
      if (bufferStart !== undefined && bufferEnd) {
        if (seekTime > bufferStart && seekTime < bufferEnd) {
          console.log('跳转时间在缓存范围内，无需加载')
          audioElement.play()
          return
        }
      }
    }

    const bufferBefore = 10 // 前3分钟
    const bufferAfter = 10 // 后3分钟
    const startTime = Math.max(0, seekTime - bufferBefore) // 加载范围的起始时间
    const endTime = seekTime + bufferAfter // 加载范围的结束时间

    // 找到需要加载的 blobs

    let findStartIndex = 0
    let totalDuration = 0
    for (let idx = 0; idx < blobs.length; idx++) {
      const blobDuration = blobs[idx].duration
      totalDuration += blobDuration
      if (totalDuration > startTime) {
        findStartIndex = idx
        break
      }
    }

    let findEndIndex = 0
    for (let idx = findStartIndex; idx < blobs.length; idx++) {
      const blobDuration = blobs[idx].duration
      totalDuration += blobDuration
      if (totalDuration > endTime) {
        findEndIndex = idx
        break
      }
    }
    console.log(`findStartIndex: ${findStartIndex}, findEndIndex: ${findEndIndex}`)
    const blobsToLoad = blobs.slice(findStartIndex, findEndIndex + 1)
    if (findEndIndex <= findStartIndex) {
      console.log('没有找到需要加载的 blobs')
      return
    }
    // 创建新的 SourceBuffer
    // if (mediaSource.sourceBuffers.length > 0) {
    //   const oldSourceBuffer = mediaSource.sourceBuffers[0]
    //   mediaSource.removeSourceBuffer(oldSourceBuffer)
    // }
    // sourceBuffer = mediaSource.addSourceBuffer(mimeType)
    if (sourceBuffer!.updating) {
      await waitUpdating()
    }

    seekingAppend = true
    await clearSourceBuffer(sourceBuffer!)

    if (sourceBuffer!.updating) {
      await waitUpdating()
    }

    // sourceBuffer!.timestampOffset = 0

    const buffers: ArrayBuffer[] = []
    for (let b of blobsToLoad) {
      const arrayBuffer = await b.blob.arrayBuffer()
      buffers.push(arrayBuffer)
    }
    const combinedBuffer = combineBuffers(buffers)
    console.log(`combinedBuffer:`, combinedBuffer.byteLength)
    await appendBuffer(combinedBuffer, true)
    await waitUpdating()
    seekingAppend = false
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

  // 追加数据到 SourceBuffer
  async function appendBuffer(data: ArrayBuffer, seeking?: boolean): Promise<void> {
    if (seekingAppend && !seeking) {
      return
    }
    if (!sourceBuffer || mediaSource.readyState !== 'open') {
      return
    }
    if (sourceBuffer.updating || isAppending) {
      await new Promise((resolve) => {
        sourceBuffer!.addEventListener('updateend', resolve, { once: true })
      })
    }
    const seekTime = audioElement.currentTime
    if (sourceBuffer.buffered?.length) {
      const bufferStart = sourceBuffer?.buffered?.start(0)
      const bufferEnd = sourceBuffer?.buffered?.end(sourceBuffer.buffered?.length - 1)
      console.log('appendBuffer当前缓存范围:', bufferStart, bufferEnd)
      if (seekTime < bufferStart) {
        console.log('跳转时间小于缓存开始时间，无需appendBuffer')
        return
      }
      if (bufferStart !== undefined && bufferEnd) {
        if (seekTime + 5 > bufferStart && seekTime + 5 < bufferEnd) {
          console.log('跳转时间在缓存范围内，无需appendBuffer')
          return
        }
      }
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
