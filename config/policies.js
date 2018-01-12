module.exports.policies = {
  'ChatbotController': {
    'subscribe': true,
    'webhook': ['verifySignature', 'validateMessage'],
  },
};
