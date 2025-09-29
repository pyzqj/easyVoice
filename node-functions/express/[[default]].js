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

// 明确定义TTS生成端点 - 使用真实的Edge-TTS API
app.post('/api/v1/tts/generate', async (req, res) => {
  try {
    const { text, voice = 'zh-CN-YunxiNeural', speed = 1.0 } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '文本内容不能为空'
      });
    }
    
    // 构建Edge-TTS API请求参数
    const ttsParams = {
      text: text,
      voice: voice,
      rate: (speed * 100).toString() + '%',
      format: 'audio-24khz-48kbitrate-mono-mp3'
    };
    
    // 调用真实的Edge-TTS API
    const response = await fetch('https://api-edge-tts.vercel.app/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ttsParams)
    });
    
    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 返回真实的API响应
    res.status(200).json({
      success: true,
      data: {
        audioUrl: data.audioUrl || data.url, // 兼容不同的响应格式
        text: text,
        voice: voice,
        speed: speed,
        message: '语音生成成功'
      }
    });
  } catch (error) {
    console.error('生成语音时发生错误:', error);
    res.status(500).json({
      success: false,
      message: '生成语音时发生错误: ' + error.message
    });
  }
});

// 获取可用引擎列表
app.get('/api/v1/tts/engines', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: [
        { id: 'edge-tts', name: 'Microsoft Edge TTS', description: '基于Microsoft Azure的高质量语音合成服务' }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取引擎列表失败'
    });
  }
});

// 获取可用语音列表
app.get('/api/v1/tts/voiceList', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: [
        { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'female', locale: 'zh-CN' },
        { id: 'zh-CN-YunxiaNeural', name: '云夏', gender: 'male', locale: 'zh-CN' },
        { id: 'zh-CN-YunyangNeural', name: '云扬', gender: 'male', locale: 'zh-CN' },
        { id: 'zh-CN-XiaoyiNeural', name: '小易', gender: 'female', locale: 'zh-CN' },
        { id: 'zh-CN-XiaomoNeural', name: '小墨', gender: 'female', locale: 'zh-CN' },
        { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', locale: 'zh-CN' },
        { id: 'zh-CN-XiaoruiNeural', name: '小瑞', gender: 'male', locale: 'zh-CN' },
        { id: 'en-US-AnaNeural', name: 'Ana', gender: 'female', locale: 'en-US' },
        { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'male', locale: 'en-US' }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取语音列表失败'
    });
  }
});

// 导出Express应用实例
export default app;