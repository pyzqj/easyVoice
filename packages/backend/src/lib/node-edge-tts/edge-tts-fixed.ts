import { randomBytes } from 'node:crypto'
import { writeFileSync, createWriteStream, WriteStream } from 'node:fs'
import { WebSocket } from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { generateSecMsGecToken, TRUSTED_CLIENT_TOKEN, CHROMIUM_FULL_VERSION } from './drm'
import { Readable } from 'node:stream'

interface SubLine {
  part: string
  start: number
  end: number
}

// 定义选项接口
interface TtsOptions {
  outputType?: 'stream' | 'buffer' | 'file' // 返回类型：流、Buffer 或写入文件
  audioPath?: string // 如果是文件输出，则需要路径
  saveSubtitles?: boolean // 是否保存字幕
}
type configure = {
  voice?: string
  lang?: string
  outputFormat?: string
  saveSubtitles?: boolean
  proxy?: string
  rate?: string
  pitch?: string
  volume?: string
  timeout?: number
}

class EdgeTTS {
  private voice: string
  private lang: string
  private outputFormat: string
  private saveSubtitles: boolean
  private proxy: string
  private rate: string
  private pitch: string
  private volume: string
  private timeout: number

  constructor({
    voice = 'zh-CN-XiaoyiNeural',
    lang = 'zh-CN',
    outputFormat = 'audio-24khz-48kbitrate-mono-mp3',
    saveSubtitles = false,
    proxy,
    rate = 'default',
    pitch = 'default',
    volume = 'default',
    timeout = 10000,
  }: configure = {}) {
    this.voice = voice
    this.lang = lang
    this.outputFormat = outputFormat
    this.saveSubtitles = saveSubtitles
    this.proxy = proxy ?? ''
    this.rate = rate
    this.pitch = pitch
    this.volume = volume
    this.timeout = timeout
  }

  async _connectWebSocket(): Promise<WebSocket> {
    const wsConnect = new WebSocket(
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`,
      {
        host: 'speech.platform.bing.com',
        origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
        },
        agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined,
      }
    )

    return new Promise((resolve: (ws: WebSocket) => void, reject: (reason: Error) => void) => {
      const timeoutId = setTimeout(() => {
        wsConnect.close()
        reject(new Error('WebSocket connection timed out'))
      }, this.timeout)

      wsConnect.on('open', () => {
        clearTimeout(timeoutId)
        wsConnect.send(
          `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
          {
            "context": {
              "synthesis": {
                "audio": {
                  "metadataoptions": {
                    "sentenceBoundaryEnabled": "false",
                    "wordBoundaryEnabled": "true"
                  },
                  "outputFormat": "${this.outputFormat}"
                }
              }
            }
          }
        `
        )
        resolve(wsConnect)
      })

      wsConnect.on('error', (err: Error) => {
        clearTimeout(timeoutId)
        reject(new Error(`WebSocket error: ${err.message}`))
      })

      wsConnect.on('close', (code: number, reason: string) => {
        clearTimeout(timeoutId)
        if (code !== 1000) {
          // 1000 表示正常关闭
          reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reason.toString()}`))
        }
      })
    })
  }

  _saveSubFile(subFile: SubLine[], text: string, audioPath: string) {
    let subPath = audioPath + '.json'
    let subChars = text.split('')
    let subCharIndex = 0
    subFile.forEach((cue: SubLine, index: number) => {
      let fullPart = ''
      let stepIndex = 0
      for (let sci = subCharIndex; sci < subChars.length; sci++) {
        if (subChars[sci] === cue.part[stepIndex]) {
          fullPart = fullPart + subChars[sci]
          stepIndex += 1
        } else if (subChars[sci] === subFile?.[index + 1]?.part?.[0]) {
          subCharIndex = sci
          break
        } else {
          fullPart = fullPart + subChars[sci]
        }
      }
      cue.part = fullPart
    })
    writeFileSync(subPath, JSON.stringify(subFile, null, '  '), { encoding: 'utf-8' })
  }

  async ttsPromise(text: string, options: TtsOptions = {}): Promise<Readable | Buffer | void> {
    const { outputType = 'buffer', audioPath, saveSubtitles = this.saveSubtitles } = options

    if (outputType === 'file' && !audioPath) {
      throw new Error('audioPath is required when outputType is "file"')
    }

    const _wsConnect = await this._connectWebSocket()
    return new Promise((resolve, reject) => {
      let audioStream: WriteStream | undefined
      let readableStream: Readable | undefined
      let audioChunks: Buffer[] = []
      let subFile: SubLine[] = []

      // 根据 outputType 初始化
      if (outputType === 'file') {
        audioStream = createWriteStream(audioPath!)
      } else if (outputType === 'stream') {
        readableStream = new Readable({
          read() {}, // 手动推送数据
        })
      }

      const timeout = setTimeout(() => {
        _wsConnect.close()
        if (readableStream) readableStream.destroy(new Error('WebSocket timed out'))
        reject(new Error(`_wsConnect.on('message') Timed out`))
      }, this.timeout)

      _wsConnect.on('message', async (data: Buffer, isBinary: boolean) => {
        clearTimeout(timeout)
        if (isBinary) {
          const separator = 'Path:audio\r\n'
          const index = data.indexOf(separator) + separator.length
          const audioData = data.subarray(index)

          if (outputType === 'file') {
            audioStream!.write(audioData)
          } else if (outputType === 'stream') {
            readableStream!.push(audioData)
          } else {
            audioChunks.push(audioData) // 收集 Buffer
          }
        } else {
          const message = data.toString()
          if (message.includes('Path:turn.end')) {
            if (outputType === 'file') {
              audioStream!.end()
              _wsConnect.close()
              if (saveSubtitles) {
                this._saveSubFile(subFile, text, audioPath!)
              }
              resolve()
            } else if (outputType === 'stream') {
              readableStream!.push(null) // 结束流
              _wsConnect.close()
              resolve(readableStream!)
            } else {
              _wsConnect.close()
              const audioBuffer = Buffer.concat(audioChunks)
              if (saveSubtitles) {
                this._saveSubFile(subFile, text, audioPath || 'temp') // 假设需要临时路径
              }
              resolve(audioBuffer)
            }
          } else if (message.includes('Path:audio.metadata')) {
            const splitTexts = message.split('\r\n')
            try {
              const metadata = JSON.parse(splitTexts[splitTexts.length - 1])
              metadata['Metadata'].forEach((element: any) => {
                subFile.push({
                  part: element['Data']['text']['Text'],
                  start: Math.floor(element['Data']['Offset'] / 10000),
                  end: Math.floor(
                    (element['Data']['Offset'] + element['Data']['Duration']) / 10000
                  ),
                })
              })
            } catch {
              // 忽略解析错误
            }
          }
        }
      })

      _wsConnect.on('error', (err: Error) => {
        clearTimeout(timeout)
        if (outputType === 'file') audioStream?.end()
        if (outputType === 'stream') readableStream?.destroy(err)
        _wsConnect.close()
        reject(new Error(`WebSocket error during transmission: ${err.message}`))
      })

      _wsConnect.on('close', (code: number, reason: string) => {
        clearTimeout(timeout)
        if (code !== 1000) {
          if (outputType === 'file') audioStream?.end()
          if (outputType === 'stream') readableStream?.destroy()
          reject(
            new Error(
              `WebSocket closed unexpectedly during transmission with code ${code}: ${reason.toString()}`
            )
          )
        }
      })

      const requestId = randomBytes(16).toString('hex')
      _wsConnect.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
          <voice name="${this.voice}">
            <prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
              ${text}
            </prosody>
          </voice>
        </speak>`
      )
    })
  }
}

export { EdgeTTS }
