// 导入必要的依赖
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit as RateLimit } from 'express-rate-limit';
import history from 'connect-history-api-fallback';
import { join } from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 配置常量
const AUDIO_DIR = join(process.cwd(), 'audio');
const PUBLIC_DIR = join(process.cwd(), 'public');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '0') || 10;
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '0') || 1000000;
const USE_HELMET = process.env.USE_HELMET === 'true' || false;
const USE_LIMIT = process.env.USE_LIMIT === 'true' || false;

// 创建Express应用
const app = express();

// 配置中间件
// CORS中间件
app.use(cors());

// JSON解析中间件
app.use(express.json({ limit: '20mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helmet安全中间件
if (USE_HELMET) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://www.google-analytics.com',
          'https://www.googletagmanager.com',
        ],
        imgSrc: ["'self'", 'https://www.google-analytics.com', 'data:', 'blob:'],
        connectSrc: ["'self'", 'https://www.google-analytics.com'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
      },
    },
  }));
}

// 速率限制中间件
if (USE_LIMIT) {
  app.use(RateLimit({
    windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
    limit: process.env.NODE_ENV === 'development' ? 1000000 : RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }));
}

// 配置路由 - 使用更明确的路由定义方式
// 健康检查路由
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TTS相关路由 - 明确定义每个端点
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

// POST /api/v1/tts/generate - 明确处理generate端点
app.post('/api/v1/tts/generate', (req, res) => {
  try {
    // 记录请求体以进行调试
    console.log('Generate request body:', req.body);
    
    // 返回模拟的成功响应
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 其他TTS POST请求
app.post('/api/v1/tts/*', (req, res) => {
  res.json({ message: 'TTS API is ready', endpoint: req.path });
});

// 配置静态文件服务
app.use(express.static(PUBLIC_DIR));
app.use('/audio', express.static(AUDIO_DIR));

// 配置历史模式回退，支持SPA应用
app.use(history());

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 重要：导出Express应用实例而不是启动服务器
export default app;