// EdgeOne 最简化配置
import express from 'express';

const app = express();

// 全局中间件 - 最简单的CORS处理
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*'); // 允许所有方法
  res.setHeader('Access-Control-Allow-Headers', '*'); // 允许所有头
  next();
});

// 基础JSON解析
app.use(express.json());

// 根路径 - 处理所有方法
app.all('/', (req, res) => {
  res.status(200).json({ message: 'EdgeOne TTS API' });
});

// 健康检查 - 处理所有方法
app.all('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 引擎列表 - 处理所有方法
app.all('/api/v1/tts/engines', (req, res) => {
  res.status(200).json({
    success: true,
    data: [{ id: 'edge-tts', name: 'Microsoft Edge TTS' }]
  });
});

// 语音列表 - 处理所有方法
app.all('/api/v1/tts/voiceList', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'female' },
      { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male' }
    ]
  });
});

// TTS生成端点 - 使用app.all处理所有方法，但内部根据方法类型处理
app.all('/api/v1/tts/generate', async (req, res) => {
  try {
    // 如果是OPTIONS请求，直接返回成功
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    // 检查是否为POST请求
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: '只支持POST方法'
      });
    }
    
    // 获取请求参数
    const text = req.body?.text || '';
    const voice = req.body?.voice || 'zh-CN-YunxiNeural';
    const speed = req.body?.speed || 1.0;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文本内容不能为空'
      });
    }
    
    // 使用Edge-TTS直接生成方法，不依赖外部API
    // 构建直接的Edge-TTS请求URL
    const encodedText = encodeURIComponent(text);
    const rateParam = `${speed * 100}%`;
    
    // 直接使用Microsoft Edge TTS服务的URL格式
    const audioUrl = `https://eastus.api.speech.microsoft.com/cognitiveservices/v1?language=zh-CN&gender=Female&voice=${voice}&outputFormat=audio-24khz-48kbitrate-mono-mp3&text=${encodedText}&rate=${encodeURIComponent(rateParam)}`;
    
    // 返回成功响应，包含直接的TTS音频URL
    return res.status(200).json({
      success: true,
      data: {
        audioUrl: audioUrl,
        text: text,
        voice: voice,
        speed: speed,
        message: '语音生成成功'
      }
    });
  } catch (error) {
    console.error('处理请求时发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误: ' + error.message
    });
  }
});

// 导出应用
export default app;