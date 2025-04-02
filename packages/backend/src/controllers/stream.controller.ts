import fs from 'fs'
import path from 'path'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import taskManager from '../utils/taskManager'
import { EdgeSchema } from '../schema/generate'
import { generateTTSStream } from '../services/tts.stream.service'
import { streamWithLimit } from '../utils'
function formatBody({ text, pitch, voice, volume, rate, useLLM }: EdgeSchema) {
  const positivePercent = (value: string | undefined) => {
    if (value === '0%' || value === '0' || value === undefined) return '+0%'
    return value
  }
  const positiveHz = (value: string | undefined) => {
    if (value === '0Hz' || value === '0' || value === undefined) return '+0Hz'
    return value
  }
  return {
    text: text.trim(),
    pitch: positiveHz(pitch),
    voice: positivePercent(voice),
    rate: positivePercent(rate),
    volume: positivePercent(volume),
    useLLM,
  }
}
/**
 * @description 流式返回音频, 支持长文本
 * @param req
 * @param res
 * @param next
 * @returns ReadableStream
 */
export async function createTaskStream(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query?.mock) {
      logger.info('Mocking audio stream...')
      streamWithLimit(res, path.join(__dirname, '../../mock/flying.mp3'), 128) // Mock stream with limit
      return
    }
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    task.context = { req, res, body: req.body }
    logger.info(`Generated stream task ID: ${task.id}`)
    generateTTSStream(formattedBody, task)
  } catch (error) {
    console.log(`createTaskStream error:`, error)
    next(error)
  }
}
