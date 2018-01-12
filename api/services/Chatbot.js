/**
 * Bot Service
 *
 * @description :: Bot service
 * @help        :: See https://sailsjs.com/documentation/concepts/services/creating-a-service
 */
var Chatbot;

switch (sails.config.chatbot.handler) {
  case 'messenger':
    Chatbot = require('./lib/handlers/messenger');
    break;
  default:
    // @Todo : implement a default handler
    //Handler = require('./lib/handlers/default').handler;
    //Bot = new Handler();
    throw new Error('Chatbot handler : You need to specify an existing handler ...');
}

module.exports = new Chatbot();
