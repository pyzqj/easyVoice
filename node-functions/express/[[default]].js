// 导入必要的依赖
import express from 'express';
import cors from 'cors';
import { join } from 'path';

// 创建Express应用
const app = express();

// 配置基本中间件
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 明确定义TTS相关路由
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

// POST /api/v1/tts/generate - 确保这个端点能正确处理POST请求
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
      message: '生成语音时发生错误',
      error: error.message
    });
  }
});

// 配置静态文件服务
const PUBLIC_DIR = join(process.cwd(), 'public');
const AUDIO_DIR = join(process.cwd(), 'audio');
app.use(express.static(PUBLIC_DIR));
app.use('/audio', express.static(AUDIO_DIR));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 导出Express应用实例
export default app;