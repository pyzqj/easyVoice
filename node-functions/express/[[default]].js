// 根据EdgeOne Express模板的最简示例
import express from 'express';

const app = express();

// 添加CORS支持 - 手动设置所有必要的头信息
app.use((req, res, next) => {
  // 允许所有来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 允许的HTTP方法
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  // 允许的请求头
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  // 允许凭证
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// JSON解析中间件
app.use(express.json());

// 根路径响应
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on EdgeOne!' });
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 明确定义TTS生成端点
app.post('/api/v1/tts/generate', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        audioUrl: 'https://example.com/audio/sample.mp3',
        text: req.body?.text || '',
        voice: req.body?.voice || 'default',
        message: '语音生成成功'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '生成语音时发生错误'
    });
  }
});

// 导出Express应用实例
export default app;