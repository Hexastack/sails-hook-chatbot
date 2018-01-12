# sails-hook-bot
Simple module for implementing a chatbot.

## Installation
1. First you need to setup a new sails project :
```javascript
sails new myChatbot
```
2. Go inside your project and install sails-hook-chatbot :
```javascript
cd myChatbot
npm install sails-hook-chatbot --save
```
3. You will need to add the following `config/chatbot.js` :
```javascript
module.exports.chatbot = {
  handler: 'messenger',
  messenger: {
    appSecret: "...",
    accessToken: "...",
    verifyToken: "..."
  }
};
```
Please note that for now only Facebook Messenger handler is available :
- You will need to signup for a facebook developer account and then create a new app in order to get the API credentials. Please visit the official documentation to get started : https://developers.facebook.com/docs/messenger-platform/getting-started.
- The webhook url you'll need to provide is `/webhook` (example: https://website.com/webhook).

4. In order to teach your chatbot what to say/do, you will need to create a new hook. As a starting example, you can create a file under `api/hooks/hello/index.js` containing :
```javascript
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
      
      return cb();
    }
  }
};
```
See the "[examples](https://github.com/Hexastack/sails-hook-chatbot/tree/master/examples)" folder for more about the usage.

## Coming soon
Our next priority is to implement a default handler that allows a simple XHR/WebSocket interactions.
Next may come is a slack handler ...

## License
MIT

## Credits
[Freeways/messenger-bot-sails](https://github.com/Freeways/messenger-bot-sails) Boiletplate has been a starting point for this project.
The messenger handler's source code is a modified version [Charca/bootbot](https://github.com/Charca/bootbot) which is a powerful JavaScript Framework to build Facebook Messenger's Chat bots. Special thanks to [Maxi Ferreira](https://github.com/Charca) !
