import { Router } from 'express'
import { validateCreateTask, validateGenerate } from '../schema/generate'
import { generateAudio, downloadAudio, getVoiceList, createTask, getTask, getTaskStats } from '../controllers/tts.controller'

const router = Router()

router.get('/voiceList', getVoiceList)
router.post('/create', validateCreateTask, createTask)
router.get('/task/stats', getTaskStats)
router.get('/task/:id', getTask)
router.post('/generate', validateGenerate, generateAudio)
router.get('/download/:file', downloadAudio)

export default router
