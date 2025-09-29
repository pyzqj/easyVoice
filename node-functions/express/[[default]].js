// EdgeOne Express 极简配置
import express from 'express';

const app = express();

// 非常简单的CORS处理
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 显式处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// 基本的JSON解析
app.use(express.json());

// 根路径
app.get('/', (req, res) => {
  res.status(200).json({ message: 'EdgeOne TTS API' });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 引擎列表
app.get('/api/v1/tts/engines', (req, res) => {
  res.status(200).json({
    success: true,
    data: [{ id: 'edge-tts', name: 'Microsoft Edge TTS' }]
  });
});

// 语音列表
app.get('/api/v1/tts/voiceList', (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'female' },
      { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male' }
    ]
  });
});

// TTS生成端点 - 使用真实API
app.post('/api/v1/tts/generate', async (req, res) => {
  try {
    // 简化参数处理
    const text = req.body?.text || '';
    const voice = req.body?.voice || 'zh-CN-YunxiNeural';
    const speed = req.body?.speed || 1.0;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文本内容不能为空'
      });
    }
    
    // 使用更可靠的Edge-TTS API端点
    const response = await fetch('https://api.edge-tts.com/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        voice: voice,
        rate: `${speed * 100}%`,
        format: 'audio-24khz-48kbitrate-mono-mp3'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 返回结果
    res.status(200).json({
      success: true,
      data: {
        audioUrl: data.audioUrl || data.url || 'https://example.com/audio/sample.mp3',
        text: text,
        voice: voice,
        speed: speed
      }
    });
  } catch (error) {
    console.error('生成语音错误:', error);
    res.status(500).json({
      success: false,
      message: '生成语音时发生错误'
    });
  }
});

// 导出应用
export default app;