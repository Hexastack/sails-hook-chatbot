var chatbotHook = require('./lib/app.js');

module.exports = function(sails) {
  chatbotHook.adaptSails(sails);

  return {
    defaults: {},

    initialize: function(cb) {
      chatbotHook.init(sails, cb);
    }
  };
};
