var _              = require('lodash');
var path           = require('path');
var loader         = require('./loaderOverride');
var ChatbotController = require('../api/controllers/ChatbotController');

module.exports = {
  init: function (sails, cb) {

    sails.services.Chatbot = require(path.join(__dirname, '../api/services/Chatbot'));

    if (sails.config.globals.services) {
      global.Chatbot = sails.services.Chatbot;
    }

    cb();
  },

  adaptSails: function (sails) {
    sails.config = _.merge(
      {},
      require(path.join(__dirname, '../config/chatbot')),
      require(path.join(__dirname, '../config/routes')),
      require(path.join(__dirname, '../config/policies')),
      sails.config
    );

    const toLoad = ['policies', 'services'];

    if (sails.registerAction) { // Test if it's sails v1 and use proper way to register actions from the authController
      for (actionName in ChatbotController) {
        if (ChatbotController.hasOwnProperty(actionName)) {
          sails.registerAction(ChatbotController[actionName], 'chatbot/' + actionName);
        }
      }
    } else {
      toLoad.push('controllers');
    }

    toLoad.forEach(function (type) {
      var pathsConfig = sails.config.paths;
      var loaderName  = 'load' + type[0].toUpperCase() + type.substr(1);

      if (!_.isArray(pathsConfig[type])) {
        pathsConfig[type] = [pathsConfig[type]];
      }

      pathsConfig[type].push(path.resolve(__dirname, '../api', type));

      sails.modules[loaderName] = _.bind(loader(type), sails.modules);
    });
  }
};
