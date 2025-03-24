import { MODEL_NAME, OPENAI_BASE_URL, OPENAI_KEY } from '../config'
import { fetcher } from './request'

// 配置接口定义
interface OpenAIConfig {
  baseURL?: string
  model?: string
  timeout: number
  apiKey?: string
}

/**
 * 创建 OpenAI 客户端实例
 * @returns OpenAI 工具函数集合
 */
export function createOpenAIClient() {
  // 默认配置
  let currentConfig: OpenAIConfig = {
    baseURL: OPENAI_BASE_URL,
    model: MODEL_NAME,
    timeout: 60000,
    apiKey: OPENAI_KEY,
  }

  // 设置 headers
  const getHeaders = () => ({
    Authorization: `Bearer ${currentConfig.apiKey}`,
    'Content-Type': 'application/json',
  })

  /**
   * 创建 Chat Completion
   * @param request 请求参数
   * @param customConfig 自定义配置，可覆盖默认配置
   */
  async function createChatCompletion(
    request: ChatCompletionRequest,
    customConfig?: Partial<OpenAIConfig>
  ): Promise<ChatCompletionResponse> {
    try {
      const mergedConfig = {
        ...currentConfig,
        ...customConfig,
      }

      const response = await fetcher.post<ChatCompletionResponse>(
        `${mergedConfig.baseURL}/chat/completions`,
        {
          model: request.model || mergedConfig.model,
          messages: request.messages,
          temperature: request.temperature ?? 1.0,
          max_tokens: request.max_tokens,
          top_p: request.top_p ?? 1.0,
          stream: request.stream ?? false,
        },
        {
          headers: getHeaders(),
          timeout: mergedConfig.timeout,
        }
      )

      return response.data
    } catch (error) {
      console.log(error)
      throw new Error(
        `Chat completion request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 获取可用模型列表
   */
  async function getModels(): Promise<{ data: { id: string }[] }> {
    try {
      const response = await fetcher.get<{ data: { id: string }[] }>(
        `${currentConfig.baseURL}/models`,
        {},
        {
          headers: getHeaders(),
          timeout: currentConfig.timeout,
        }
      )
      return response.data
    } catch (error) {
      throw new Error(
        `Get models failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 动态更新配置
   * @param newConfig 新的配置参数
   */
  function config(newConfig: Partial<OpenAIConfig>) {
    currentConfig = {
      ...currentConfig,
      ...newConfig,
    }
  }

  return {
    createChatCompletion,
    getModels,
    config,
  }
}

// 默认实例
export const openai = createOpenAIClient()

// // 使用示例
// async function example() {
//   // 使用默认配置
//   const client = createOpenAIClient()

//   try {
//     // 使用初始配置
//     const initialResponse = await client.createChatCompletion({
//       messages: [{ role: 'user', content: 'Hello' }],
//     })
//     console.log('Initial response:', initialResponse.choices[0].message.content)

//     // 动态修改配置
//     client.config({
//       baseURL: 'https://custom-api.com/v1',
//       apiKey: 'new-api-key',
//       model: 'new-model',
//     })

//     // 使用新配置
//     const updatedResponse = await client.createChatCompletion({
//       messages: [{ role: 'user', content: 'Hi with new config' }],
//     })
//     console.log('Updated response:', updatedResponse.choices[0].message.content)
//   } catch (error) {
//     console.error('Error:', error)
//   }
// }
