// 导入必要的依赖
import express from 'express';

// 创建Express应用实例
const app = express();

// 配置基础中间件
app.use(express.json());

// 记录请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 明确定义TTS相关端点
// GET /api/v1/tts/engines
app.get('/api/v1/tts/engines', (req, res) => {
  res.json([{
    name: 'edge-tts',
    languages: ['zh-CN', 'en-US'],
    voices: []
  }]);
});

// GET /api/v1/tts/voiceList
app.get('/api/v1/tts/voiceList', (req, res) => {
  res.json({ voices: [] });
});

// 关键端点：POST /api/v1/tts/generate
app.post('/api/v1/tts/generate', (req, res) => {
  try {
    console.log('Generate request body:', req.body);
    res.status(200).json({
      success: true,
      data: {
        audioUrl: 'https://example.com/audio/sample.mp3',
        text: req.body?.text || '',
        voice: req.body?.voice || 'default',
        message: '语音生成成功（模拟响应）'
      }
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({
      success: false,
      message: '生成语音时发生错误'
    });
  }
});

// 导出Express应用
export default app;