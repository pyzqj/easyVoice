import { Router } from 'express'
import {
  generateAudio,
  downloadAudio,
  getVoiceList,
  createTask,
  getTask,
  getTaskStats,
} from '../controllers/tts.controller'
import { pickSchema } from '../controllers/pick.controller'

const router = Router()

router.get('/voiceList', getVoiceList)
router.get('/task/stats', getTaskStats)
router.get('/task/:id', getTask)
router.get('/download/:file', downloadAudio)

router.post('/create', pickSchema, createTask)
router.post('/generate', pickSchema, generateAudio)

export default router
