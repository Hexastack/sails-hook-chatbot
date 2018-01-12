const Chat = require('./Chat');
const textMatchesPatterns = require('../../utils/text-matches-patterns');

module.exports = function(bot, userId) {
  Chat.call(this, bot, userId);
  this.context = {};
  this.waitingForAnswer = false;

  this.ask = function(question, answer, callbacks, options) {
    if (!question || !answer || typeof answer !== 'function') {
      return sails.log.error('Messenger bot handler : You need to specify a question and answer to ask');
    }
    if (typeof question === 'function') {
      question.apply(this, [ this ]);
    } else {
      this.say(question, options);
    }
    this.waitingForAnswer = true;
    this.listeningAnswer = answer;
    this.listeningCallbacks = Array.isArray(callbacks) ? callbacks : (callbacks ? [ callbacks ] : []);
    return this;
  }

  this.respond = function(payload, data) {
    sails.log.debug('Messenger bot handler : humm ... what should i respond to this ', payload);
    if (!this.isWaitingForAnswer()) {
      // If the conversation has been started but no question has been asked yet,
      // ignore the response. This is usually caused by a race condition with long
      // typing indicators.
      sails.log.debug('Messenger bot handler : Sorry but i\'m not waiting for an anwser.');
      return;
    }
    // Check for callbacks listening for postback or quick_reply
    if (data.type === 'postback' || data.type === 'quick_reply') {
      const postbackPayload = (data.type === 'postback') ? payload.postback.payload : payload.message.quick_reply.payload;
      const specificPostbackCallback = this.listeningCallbacks.find(function(callbackObject) {
        return callbackObject.event === data.type + ':' + postbackPayload
      });
      if (specificPostbackCallback && typeof specificPostbackCallback.callback === 'function') {
        this.stopWaitingForAnswer();
        return specificPostbackCallback.callback.apply(this, [ payload, this, data ]);
      }

      const genericPostbackCallback = this.listeningCallbacks.find(function(callbackObject) {
        return callbackObject.event === data.type
      });
      if (genericPostbackCallback && typeof genericPostbackCallback.callback === 'function') {
        this.stopWaitingForAnswer();
        return genericPostbackCallback.callback.apply(this, [ payload, this, data ]);
      }
    }

    // Check for a callback listening for an attachment
    if (data.type === 'attachment') {
      const attachmentCallback = this.listeningCallbacks.find(function(callbackObject) {
        return callbackObject.event === 'attachment'
      });
      if (attachmentCallback && typeof attachmentCallback.callback === 'function') {
        this.stopWaitingForAnswer();
        return attachmentCallback.callback.apply(this, [ payload, this, data ]);
      }
    }

    // Check for text messages that match a listening pattern
    const patternCallbacks = this.listeningCallbacks.filter(function(callbackObject) {
      return callbackObject.pattern !== undefined
    });
    if (data.type === 'message' && patternCallbacks.length > 0) {
      for (var i = 0; i < patternCallbacks.length; i += 1) {
        const match = textMatchesPatterns(payload.message.text, patternCallbacks[i].pattern);
        if (match !== false) {
          this.stopWaitingForAnswer();
          data.keyword = match.keyword;
          if (match.match) {
            data.match = match.match;
          }
          return patternCallbacks[i].callback.apply(this, [ payload, this, data ]);
        }
      }
    }

    // If event is a text message that contains a quick reply, and there's already a listening callback
    // for that quick reply that will be executed later, return without calling listeningAnswer
    if (data.type === 'message' && payload.message.quick_reply && payload.message.quick_reply.payload) {
      const quickReplyCallback = this.listeningCallbacks.find(function(callbackObject) {
        return callbackObject.event === 'quick_reply' || callbackObject.event === 'quick_reply:' + payload.message.quick_reply.payload
      });
      if (quickReplyCallback && typeof quickReplyCallback.callback === 'function') {
        return;
      }
    }

    // If event is quick_reply at this point, it means there was no quick_reply callback listening,
    // and the message was already responded when the message event fired, so return without calling listeningAnswer
    if (data.type === 'quick_reply') {
      return;
    }

    if (this.listeningAnswer && typeof this.listeningAnswer === 'function') {
      // Solution for nested conversation.ask()
      sails.log.debug('Messenger bot handler : Respond to nested conversion! Go next ');
      const listeningAnswer = this.listeningAnswer;
      this.listeningAnswer = null;
      listeningAnswer.apply(this, [payload, this, data]);
      return this;
    }
    // Conversation is still active, but there's no callback waiting for a response.
    // This probably means you forgot to call convo.end(); in your last callback.
    // We'll end the convo but this message is probably lost in time and space.
    return this.end();
  }

  this.isActive = function() {
    return this.active;
  }

  this.isWaitingForAnswer = function() {
    return this.waitingForAnswer;
  }

  this.stopWaitingForAnswer = function() {
    this.waitingForAnswer = false;
    this.listeningCallbacks = [];
  }

  this.start = function() {
    this.active = true;
    sails.emit('hook:chatbot:conversation:start', this);
    return this;
  }

  this.end = function() {
    this.active = false;
    sails.emit('hook:chatbot:conversation:end', this);
    return this;
  }

  this.get = function(property) {
    return this.context[property];
  }

  this.set = function(property, value) {
    this.context[property] = value;
    return this.context[property];
  }

  // Let's rock'n'roll
  this.start();
}
