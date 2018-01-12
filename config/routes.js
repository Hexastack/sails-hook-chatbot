module.exports.routes = {
  'get /webhook': {
    controller: 'ChatbotController',
    action: 'subscribe'
  },
  'post /webhook': {
    controller: 'ChatbotController',
    action: 'webhook'
  },
}
