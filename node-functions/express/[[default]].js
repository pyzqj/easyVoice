// 根据EdgeOne Express模板的最简示例
import express from 'express';

const app = express();

// 非常基础的JSON解析中间件
app.use(express.json());

// 根路径响应
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on EdgeOne!' });
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 明确定义TTS生成端点 - 使用最简实现
app.post('/api/v1/tts/generate', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      audioUrl: 'https://example.com/audio/sample.mp3',
      text: req.body?.text || '',
      voice: req.body?.voice || 'default',
      message: '语音生成成功'
    }
  });
});

// 导出Express应用实例
export default app;