module.exports = function(bot, userId) {
  if (!bot || !userId) {
    throw new Error('Messenger bot handler : You need to specify a BootBot instance and a userId');
  }
  this.bot = bot;
  this.userId = userId;

  this.say = function(message, options) {
    return this.bot.say(this.userId, message, options);
  }

  this.sendTextMessage = function(text, quickReplies, options) {
    return this.bot.sendTextMessage(this.userId, text, quickReplies, options);
  }

  this.sendButtonTemplate = function(text, buttons, options) {
    return this.bot.sendButtonTemplate(this.userId, text, buttons, options);
  }

  this.sendGenericTemplate = function(cards, options) {
    return this.bot.sendGenericTemplate(this.userId, cards, options);
  }

  this.sendListTemplate = function(elements, buttons, options) {
    return this.bot.sendListTemplate(this.userId, elements, buttons, options);
  }

  this.sendTemplate = function(payload, options) {
    return this.bot.sendTemplate(this.userId, payload, options);
  }

  this.sendAttachment = function(type, url, quickReplies, options) {
    return this.bot.sendAttachment(this.userId, type, url, quickReplies, options);
  }

  this.sendAction = function(action, options) {
    return this.bot.sendAction(this.userId, action, options);
  }

  this.sendMessage = function(message, options) {
    return this.bot.sendMessage(this.userId, message, options);
  }

  this.sendRequest = function(body, endpoint, method) {
    return this.bot.sendRequest(body, endpoint, method);
  }

  this.sendTypingIndicator = function(milliseconds) {
    return this.bot.sendTypingIndicator(this.userId, milliseconds);
  }

  this.getUserProfile = function() {
    return this.bot.getUserProfile(this.userId);
  }

  this.conversation = function(factory) {
    return this.bot.conversation(this.userId, factory);
  }
}
