import axios from 'axios'

// EdgeOne Pages API配置
const DEV_URL = 'http://localhost:3000/api/v1/tts'
// 生产环境使用简化路径，适应EdgeOne Pages的路由规则
const PROD_URL = import.meta.env.VITE_API_URL || '/api/tts'
const baseURL = import.meta.env.MODE === 'development' ? DEV_URL : PROD_URL

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
})

export interface GenerateRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  useLLM?: boolean
  openaiBaseUrl?: string
  openaiKey?: string
  openaiModel?: string
}
export interface TaskRequest {
  id: string
}
export interface TaskResponse {
  success: string
  url: string
  progress: number
  message?: string
}

export interface ResponseWrapper<T> {
  success: boolean
  data?: T
  code: number
  message?: string
}
export interface GenerateResponse {
  audio: string
  file: string
  srt?: string
  size?: number
  id: string
  taskId?: string
  status?: string
}
export type Voice = {
  Name: string
  cnName?: string
  Gender: string
  ContentCategories: string[]
  VoicePersonalities: string[]
}
export interface Task {
  id: string
  fields: any
  status: string
  progress: number
  message: string
  code?: string | number
  result: any
  createdAt: Date
  updatedAt?: Date
  updateProgress?: (taskId: string, progress: number) => Task | undefined
}
export const getVoiceList = async () => {
  const response = await api.get<ResponseWrapper<Voice[]>>('/voiceList')
  if (response.data?.code !== 200 || !response.data?.success) {
    // 适配EdgeOne直接返回数据的格式
    if (Array.isArray(response.data)) {
      return { success: true, data: response.data, code: 200 }
    }
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}

export const generateTTS = async (data: GenerateRequest) => {
  const response = await api.post<ResponseWrapper<GenerateResponse>>('/generate', data)
  if (response.data?.code !== 200 || !response.data?.success) {
    // 适配EdgeOne直接返回数据的格式
    // 不直接依赖taskId属性，而是检查是否是有效的对象数据
    if (response.data && typeof response.data === 'object' && 
        (!('code' in response.data) || !('success' in response.data))) {
      return { success: true, data: response.data, code: 200 }
    }
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}
export const getTask = async (data: TaskRequest) => {
  const response = await api.get<ResponseWrapper<Task>>(`/task/${data.id}`)
  if (response.data?.code !== 200 || !response.data?.success) {
    // 适配EdgeOne直接返回数据的格式
    // 不直接依赖taskId属性，而是检查是否是有效的对象数据
    if (response.data && typeof response.data === 'object' && 
        (!('code' in response.data) || !('success' in response.data))) {
      return { success: true, data: response.data, code: 200 }
    }
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}
export const createTask = async (data: TaskRequest) => {
  const response = await api.post<ResponseWrapper<Task>>(`/create`, data)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}

export const createTaskStream = async (data: TaskRequest) => {
  try {
    // EdgeOne Pages环境下调整流式处理方式
    const response = await api.post<ResponseWrapper<GenerateResponse>>(
      `/createStream`,
      data,
      {
        // 在EdgeOne Pages环境中使用fetch适配器
        adapter: 'fetch',
        timeout: 0,
      }
    )
    
    return response.data
  } catch (error) {
    console.error('Stream request failed:', error)
    throw error
  }
}

export const downloadFile = (file: string) => {
  // 适配EdgeOne Pages的文件下载路径
  return import.meta.env.MODE === 'development' 
    ? `${api.defaults.baseURL}/download/${file}`
    : `/api/tts/download/${file}`
}
