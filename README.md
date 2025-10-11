# EasyVoice - AI语音合成平台

EasyVoice 是一个现代化的AI语音合成平台，支持多种语音引擎，提供流畅的文本转语音服务。本项目已适配腾讯云EdgeOne Pages部署环境。

## 项目特性

- 支持多种TTS语音引擎
- 实时流式语音合成
- 多语言支持
- 语音参数自定义配置
- 响应式Web界面
- 完全适配EdgeOne Pages和Edge Functions

## 技术架构

- **前端**: Vue 3 + TypeScript + Vite + Element Plus
- **后端**: Node.js Edge Functions (适配EdgeOne)
- **API通信**: RESTful API + 流式响应

## 部署指南（EdgeOne Pages）

### 前置条件

- 腾讯云账号
- 已开通EdgeOne服务
- Git环境

### 部署步骤

1. **代码准备**

   将本项目克隆到本地：
   ```bash
   git clone <your-repository-url>
   cd easyVoice
   ```

2. **EdgeOne Pages配置**

   - 登录[腾讯云EdgeOne控制台](https://console.cloud.tencent.com/edgeone)
   - 进入「边缘函数」->「EdgeOne Pages」
   - 点击「新建项目」
   - 选择代码源（GitHub/GitLab/Gitee）
   - 配置构建参数：
     - 构建命令：`npm run build` (会自动执行pages.config.js中的配置)
     - 输出目录：`./packages/frontend/dist`
     - 框架类型：Vue
   - 环境变量设置（可选）：
     - NODE_ENV: production

3. **环境变量配置**（如果需要）

   在EdgeOne Pages项目设置中配置必要的环境变量：
   - `API_URL`: API基础URL（默认使用Edge Functions路径）

4. **部署项目**

   点击「部署」按钮，EdgeOne将自动构建并部署您的应用。

### Edge Functions配置

本项目已包含必要的Edge Functions代码：

- `node-functions/api/tts.js`: TTS相关API端点
- `node-functions/api/health.js`: 健康检查端点

EdgeOne会自动识别这些函数并部署。

## 本地开发

### 前端开发

```bash
cd packages/frontend
npm install
npm run dev
```

### Edge Functions本地测试

```bash
# 安装EdgeOne CLI工具（如果需要）
npm install -g @cloudbase/cli

# 本地模拟Edge Functions环境
cloudbase functions local
```

## 项目结构

```
easyVoice/
├── node-functions/       # EdgeOne Functions
│   └── api/              # API端点函数
│       ├── tts.js        # TTS服务API
│       └── health.js     # 健康检查API
├── packages/
│   ├── frontend/         # 前端代码
│   │   ├── src/          # 源码
│   │   └── dist/         # 构建输出
├── pages.config.js       # EdgeOne Pages配置
└── README.md             # 项目文档
```

## API接口

### TTS服务

- `GET /api/voiceList`: 获取语音列表
- `POST /api/generate`: 生成TTS音频
- `POST /api/create`: 创建TTS任务
- `POST /api/createStream`: 创建流式TTS任务
- `GET /api/task/:id`: 获取任务状态

### 健康检查

- `GET /api/health`: 服务健康检查

## 注意事项

1. 在EdgeOne环境中，流式响应可能有特殊处理要求
2. 音频文件存储使用EdgeOne Pages的静态资源能力
3. 确保所有API路径正确映射到Edge Functions
4. 对于大文件处理，考虑使用分块或异步方式

## 许可证

MIT License
