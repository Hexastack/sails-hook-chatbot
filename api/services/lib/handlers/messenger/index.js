/**
 * Messenger Bot handler
 *
 * @description :: Messenger Bot handler
 */

const Chat = require('./Chat');
const Conversation = require('./Conversation');

const normalizeString = require('../../utils/normalize-string');
const fetch = require('node-fetch');

module.exports = function() {
  var options = sails.config.chatbot.messenger || false;
  if (!options || (options && (!options.accessToken || !options.verifyToken || !options.appSecret))) {
    throw new Error('Messenger bot handler : You need to specify an accessToken, verifyToken and appSecret');
  }

  this.accessToken = options.accessToken;
  this.verifyToken = options.verifyToken;
  this.appSecret = options.appSecret;

  this._hearMap = [];
  this._conversations = [];

  sails.on('hook:chatbot:conversation:end', function(endedConvo) {
    sails.log.debug('Messenger bot handler : The conversation has been ended with ' + endedConvo.userId);
    const removeIndex = Chatbot._conversations.indexOf(endedConvo);
    Chatbot._conversations.splice(removeIndex, 1);    
  });

  // Subscribe
  this.subscribe = function(data, cb) {
    if (!this.verifyToken) {
      return cb(new Error('Messenger bot handler : You need to specify a verifyToken in your config.'));
    }
    if (!data || !data['hub.mode'] || !data['hub.verify_token']) {
      return cb(new Error('Messenger bot handler : Did not recieve any verification token.'));
    }
    if (data['hub.mode'] === 'subscribe' &&
      data['hub.verify_token'] === this.verifyToken) {
      sails.log.info("Messenger bot handler : Subscription token has been verified successfully!");
      return cb(null, data['hub.challenge']);
    } else {
      sails.log.error("Messenger bot handler : Failed validation. Make sure the validation tokens match.");
      return cb(new Error('"Messenger bot handler : Failed validation. Make sure the validation tokens match.'));
    }
  };

  // Define dialog functions
  this.hear = function(keywords, callback) {
    var _hearMap = this._hearMap;
    keywords = Array.isArray(keywords) ? keywords : [keywords];
    keywords.forEach(function(keyword) {
      _hearMap.push({
        keyword,
        callback
      })
    });
    return this;
  };

  this.say = function(recipientId, message, options) {
    sails.log.debug('Messenger bot handler : Message to be sent to ' + recipientId, message);
    if (typeof message === 'string') {
      return this.sendTextMessage(recipientId, message, [], options);
    } else if (message && message.text) {
      if (message.quickReplies && message.quickReplies.length > 0) {
        return this.sendTextMessage(recipientId, message.text, message.quickReplies, options);
      } else if (message.buttons && message.buttons.length > 0) {
        return this.sendButtonTemplate(recipientId, message.text, message.buttons, options);
      }
    } else if (message && message.attachment) {
      return this.sendAttachment(recipientId, message.attachment, message.url, message.quickReplies, options);
    } else if (message && message.elements && message.buttons) {
      return this.sendListTemplate(recipientId, message.elements, message.buttons, options);
    } else if (message && message.cards) {
      return this.sendGenericTemplate(recipientId, message.cards, options);
    } else if (Array.isArray(message)) {
      return message.reduce(function(promise, msg) {
        return promise.then(function() {
          this.say(recipientId, msg, options);
        });
      }, Promise.resolve());
    }
    sails.log.error('Messenger bot handler : Invalid format for .say() message.');
  }

  this.module = function(factory) {
    return factory.apply(this, [this]);
  }

  this.conversation = function(recipientId, factory) {
    if (!recipientId || !factory || typeof factory !== 'function') {
      return sails.log.error('Messenger bot handler : You need to specify a recipient and a callback to start a conversation');
    }
    const convo = new Conversation(this, recipientId);
    sails.log.debug('Messenger bot handler : A new conversation has been started with ' + recipientId);
    this._conversations.push(convo);

    factory.apply(this, [convo]);
    return convo;
  }

  // Message handlers
  this.handle = function(data, cb) {
    sails.log.debug('Messenger bot handler : Webhook notification received ', JSON.stringify(data));
    if (!('entry' in data)) {
      sails.log.error('Messenger bot handler : Webhook received no entry data.');
      return cb(new Error('Messenger bot handler : Webhook received no entry data.'))
    }
    var bot = this;
    // Iterate over each entry. There may be multiple if batched.
    data.entry.forEach(function(entry) {
      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message && event.message.is_echo && !this.broadcastEchoes) {
          return;
        }
        if (event.optin) {
          bot._handleEvent('authentication', event);
        } else if (event.message && event.message.text) {
          bot._handleMessageEvent(event);
          if (event.message.quick_reply) {
            bot._handleQuickReplyEvent(event);
          }
        } else if (event.message && event.message.attachments) {
          bot._handleAttachmentEvent(event);
        } else if (event.postback) {
          bot._handlePostbackEvent(event);
        } else if (event.delivery) {
          bot._handleEvent('delivery', event);
        } else if (event.read) {
          bot._handleEvent('read', event);
        } else if (event.account_linking) {
          bot._handleEvent('account_linking', event);
        } else if (event.referral) {
          bot._handleEvent('referral', event);
        } else {
          sails.log.error('Messenger bot handler : Webhook received unknown event ', event);
          return cb(new Error('Webhook received unknown event'))
        }
      });
    });
    cb();
  };

  this._handleEvent = function(type, event, data) {
    const recipient = (type === 'authentication' && !event.sender) ? {
      user_ref: event.optin.user_ref
    } : event.sender.id;
    const chat = new Chat(this, recipient);

    sails.emit('hook:chatbot:' + type, {
      event: event,
      chat: chat,
      data: data
    });
  };

  this._handleMessageEvent = function(event) {
    if (this._handleConversationResponse('message', event)) {
      return;
    }
    const text = event.message.text;
    const senderId = event.sender.id;
    var captured = false;
    if (!text) {
      return;
    }

    var bot = this;
    this._hearMap.forEach(function(hear) {
      var res;
      if (typeof hear.keyword === 'string' && hear.keyword.toLowerCase() === text.toLowerCase()) {
         res = hear.callback.apply(bot, [event, new Chat(bot, senderId), {
          keyword: hear.keyword,
          captured
        }]);
        captured = true;
        return res;
      } else if (hear.keyword instanceof RegExp && hear.keyword.test(text)) {
        res = hear.callback.apply(bot, [event, new Chat(bot, senderId), {
          keyword: hear.keyword,
          match: text.match(hear.keyword),
          captured
        }]);
        captured = true;
        return res;
      }
    });

    this._handleEvent('message', event, {
      captured
    });
  };

  this._handleAttachmentEvent = function(event) {
    if (this._handleConversationResponse('attachment', event)) {
      return;
    }
    this._handleEvent('attachment', event);
  };

  this._handlePostbackEvent = function(event) {
    if (this._handleConversationResponse('postback', event)) {
      return;
    }
    const payload = event.postback.payload;
    if (payload) {
      this._handleEvent('postback:' + payload, event);
    }
    this._handleEvent('postback', event);
  };

  this._handleQuickReplyEvent = function(event) {
    if (this._handleConversationResponse('quick_reply', event)) {
      return;
    }
    const payload = event.message.quick_reply && event.message.quick_reply.payload;
    if (payload) {
      this._handleEvent('quick_reply:' + payload, event);
    }
    this._handleEvent('quick_reply', event);
  };

  this._handleConversationResponse = function(type, event) {
    const userId = event.sender.id;
    var captured = false;
    sails.log.debug('Messenger bot handler : Is this message a part of a conversation ? Searching ... ', type, event);
    this._conversations.forEach(function(convo) {
      if (userId && userId === convo.userId && convo.isActive()) {
        captured = true;
        return convo.respond(event, {
          type
        });
      }
    });
    sails.log.debug('Messenger bot handler : Conversation ' + (captured?'has been captured':'not captured') +'!');
    return captured;
  };

  // Messenger format messages
  this._formatButtons = function(buttons) {
    return buttons && buttons.map(function(button) {
      if (typeof button === 'string') {
        return {
          type: 'postback',
          title: button,
          payload: 'BOT_BUTTON_' + normalizeString(button)
        };
      } else if (button && button.type) {
        return button;
      }
      return {};
    });
  };

  this._formatQuickReplies = function(quickReplies) {
    return quickReplies && quickReplies.map(function(reply) {
      if (typeof reply === 'string') {
        return {
          content_type: 'text',
          title: reply,
          payload: 'BOT_QR_' + normalizeString(reply)
        };
      } else if (reply && reply.title) {
        return Object.assign({
          content_type: 'text',
          payload: 'BOT_QR_' + normalizeString(reply.title)
        }, reply);
      }
      return reply;
    });
  };

  // Messenger send messages
  this.sendTextMessage = function(recipientId, text, quickReplies, options) {
    const message = {
      text
    };
    const formattedQuickReplies = this._formatQuickReplies(quickReplies);
    if (formattedQuickReplies && formattedQuickReplies.length > 0) {
      message.quick_replies = formattedQuickReplies;
    }
    return this.sendMessage(recipientId, message, options);
  };

  this.sendButtonTemplate = function(recipientId, text, buttons, options) {
    const payload = {
      template_type: 'button',
      text
    };
    const formattedButtons = this._formatButtons(buttons);
    payload.buttons = formattedButtons;
    return this.sendTemplate(recipientId, payload, options);
  };

  this.sendGenericTemplate = function(recipientId, elements, options) {
    const payload = {
      template_type: 'generic',
      elements
    };
    options && options.imageAspectRatio && (payload.image_aspect_ratio = options.imageAspectRatio) && (delete options.imageAspectRatio);
    return this.sendTemplate(recipientId, payload, options);
  };

  this.sendListTemplate = function(recipientId, elements, buttons, options) {
    const payload = {
      template_type: 'list',
      elements
    };
    options && options.topElementStyle && (payload.top_element_style = options.topElementStyle) && (delete options.topElementStyle);
    buttons && buttons.length && (payload.buttons = this._formatButtons([buttons[0]]));
    return this.sendTemplate(recipientId, payload, options);
  };

  this.sendTemplate = function(recipientId, payload, options) {
    const message = {
      attachment: {
        type: 'template',
        payload
      }
    };
    return this.sendMessage(recipientId, message, options);
  };

  this.sendAttachment = function(recipientId, type, url, quickReplies, options) {
    const message = {
      attachment: {
        type,
        payload: {
          url
        }
      }
    };
    const formattedQuickReplies = this._formatQuickReplies(quickReplies);
    if (formattedQuickReplies && formattedQuickReplies.length > 0) {
      message.quick_replies = formattedQuickReplies;
    }
    return this.sendMessage(recipientId, message, options);
  };

  this.sendAction = function(recipientId, action, options) {
    const recipient = this._createRecipient(recipientId);
    return this.sendRequest({
      recipient,
      sender_action: action
    });
  };

  this.sendMessage = function(recipientId, message, options) {
    const recipient = this._createRecipient(recipientId);
    const onDelivery = options && options.onDelivery;
    const onRead = options && options.onRead;
    var bot = this;
    const req = function() {
      return bot.sendRequest({
        recipient,
        message
      }).then(function(json) {
        if (typeof onDelivery === 'function') {
          sails.once('bot:delivery', onDelivery);
        }
        if (typeof onRead === 'function') {
          sails.once('bot:read', onRead);
        }
        return json;
      });
    };
    if (options && options.typing) {
      const autoTimeout = (message && message.text) ? message.text.length * 10 : 1000;
      const timeout = (typeof options.typing === 'number') ? options.typing : autoTimeout;
      return this.sendTypingIndicator(recipientId, timeout)
        .then(req)
        .catch(function(err) {
          sails.log.error('Messenger bot handler : sendTypingIndicator error ', err);
        });
    }
    return req();
  };

  this.sendRequest = function(body, endpoint, method) {
    endpoint = endpoint || 'messages';
    method = method || 'POST';
    return fetch('https://graph.facebook.com/v2.6/me/' + endpoint + '?access_token=' + this.accessToken, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
      .then(function(res) {
        return res.json();
      })
      .then(function(res) {
        if (res.error) {
          sails.log.error('Messenger bot handler : Messenger Error received. For more information about error codes, see: https://goo.gl/d76uvB', res.error);
        }
        return res;
      })
      .catch(function(err) {
        sails.log.error('Messenger bot handler : Error sending message ', err)
      });
  };

  this.sendProfileRequest = function(body, method) {
    return this.sendRequest(body, 'messenger_profile', method);
  };

  this.sendTypingIndicator = function(recipientId, milliseconds) {
    const timeout = isNaN(milliseconds) ? 0 : milliseconds;
    if (milliseconds > 20000) {
      milliseconds = 20000;
      sails.log.error('Messenger bot handler : sendTypingIndicator max milliseconds value is 20000 (20 seconds)');
    }

    var bot = this;
    return new Promise(function(resolve, reject) {
      return bot.sendAction(recipientId, 'typing_on').then(function() {
        setTimeout(function() {
          try {
            bot.sendAction(recipientId, 'typing_off')
              .then(function(json) {
                resolve(json)
              });
          } catch (err) {
            reject(err);
          }
        }, timeout);
      });
    });
  };

  // Misc
  this._createRecipient = function(recipient) {
    return (typeof recipient === 'object') ? recipient : {
      id: recipient
    };
  };

  this.getUserProfile = function(userId) {
    const url = 'https://graph.facebook.com/v2.6/' + userId + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + this.accessToken;
    return fetch(url)
      .then(function(res) {
        return res.json();
      })
      .catch(function(err) {
        sails.log.error('Messenger bot handler : Error getting user profile', err);
      });
  };

  this.setGreetingText = function(text) {
    const greeting = (typeof text !== 'string') ? text : [{
      locale: 'default',
      text
    }];
    return this.sendProfileRequest({
      greeting
    });
  };

  this.setGetStartedButton = function(action) {
    const payload = (typeof action === 'string') ? action : 'BOT_GET_STARTED';
    if (typeof action === 'function') {
      sails.on('hook:chatbot:postback:' + payload, action);
    }
    return this.sendProfileRequest({
      get_started: {
        payload
      }
    });
  };

  this.deleteGetStartedButton = function() {
    return this.sendProfileRequest({
      fields: [
        'get_started'
      ]
    }, 'DELETE');
  };

  this.setPersistentMenu = function(buttons, disableInput) {
    if (buttons && buttons[0] && buttons[0].locale !== undefined) {
      // Received an array of locales, send it as-is.
      return this.sendProfileRequest({
        persistent_menu: buttons
      });
    }
    // If it's not an array of locales, we'll assume is an array of buttons.
    const formattedButtons = this._formatButtons(buttons);
    return this.sendProfileRequest({
      persistent_menu: [{
        locale: 'default',
        composer_input_disabled: disableInput || false,
        call_to_actions: formattedButtons
      }]
    });
  };

  this.deletePersistentMenu = function() {
    return this.sendProfileRequest({
      fields: [
        'persistent_menu'
      ]
    }, 'DELETE');
  };
}
