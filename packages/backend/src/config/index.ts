import dotenv from 'dotenv'
import { resolve, join } from 'path'

dotenv.config({
  path: [
    resolve(__dirname, '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', '..', '.env'),
  ],
})
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
}

export const AUDIO_DIR = join(__dirname, '..', '..', 'audio')
export const AUDIO_CACHE_DIR = join(AUDIO_DIR, '.cache')
export const PUBLIC_DIR = join(__dirname, '..', '..', 'public')
export const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.srt'])

export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY
export const MODEL_NAME = process.env.MODEL_NAME

export const STATIC_DOMAIN = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''

export const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '0') || 10
export const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '0') || 1e6

export const EDGE_API_LIMIT = parseInt(process.env.EDGE_API_LIMIT || '3') || 3
