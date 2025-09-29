// 简化版配置文件
export const config = {
  // OpenAI配置
  openai: {
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.MODEL_NAME
  },
  // 其他配置
  edgeApiLimit: parseInt(process.env.EDGE_API_LIMIT || '3') || 3,
  directGenLimit: process.env.DIRECT_GEN_LIMIT || 200
};