module.exports = function(sails) {

  return {
    initialize: function(cb) {
      // Add the script breakdown to the Chatbot instance (Service)
      Chatbot.hear(['hello', 'hi', /hey( there)?/i], function(payload, chat) {
        // Send a text message followed by another text message that contains a typing indicator
        chat.say('Hello, human friend!').then(function() {
          chat.say('How are you today?', {
            typing: true
          });
        });
      });

      Chatbot.hear(['food', 'hungry'], function(payload, chat) {
        // Send a text message with quick replies
        chat.say({
          text: 'What do you want to eat today?',
          quickReplies: ['Mexican', 'Italian', 'American', 'Argentine']
        });
      });

      Chatbot.hear(['help'], function(payload, chat) {
        // Send a text message with buttons
        chat.say({
          text: 'What do you need help with?',
          buttons: [{
              type: 'postback',
              title: 'Settings',
              payload: 'HELP_SETTINGS'
            },
            {
              type: 'postback',
              title: 'FAQ',
              payload: 'HELP_FAQ'
            },
            {
              type: 'postback',
              title: 'Talk to a human',
              payload: 'HELP_HUMAN'
            }
          ]
        });
      });

      Chatbot.hear('image', function(payload, chat) {
        // Send an attachment
        chat.say({
          attachment: 'image',
          url: 'https://source.unsplash.com/random/546x563/?code'
        });
      });

      Chatbot.hear('ask me something', function(payload, chat) {
        chat.conversation(function(convo) {
          convo.ask("What's your name?", function(payload, convo) {
            const text = payload.message.text;
            convo.set('name', text);
            convo.say('Oh, your name is ' + text)
              .then(function() {
                convo.ask("What's your favorite food?", function(payload, convo) {
                  const text = payload.message.text;
                  convo.set('food', text);
                  convo.say('Got it, your favorite food is ' + text)
                    .then(function(){
                      convo.say("Ok, here's what you told me about you: \
                        - Name: " + convo.get('name') + " \
                        - Favorite Food: " + convo.get('food'));
                      convo.end();
                    });
                });
              });
          });
        });
      });

      return cb();
    }
  }

};
