// EdgeOne Pages健康检查API
exports.main = async function(context) {
  const { response } = context;
  
  // CORS配置
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response.status(200).json({
    status: 'ok',
    message: 'EasyVoice API is running on EdgeOne Pages',
    timestamp: new Date().toISOString()
  });
};