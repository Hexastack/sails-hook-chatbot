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
3. You will need to add the following `config/chatbot.js` (currenty only messenger is available) :
```javascript
module.exports.chatbot = {
  handler: 'messenger',
	messenger: {
     fbApiVersion: "v2.10",
	   appSecret: "...",
	   accessToken: "...",
	   verifyToken: "..."
  }
};
```
You will need to create a facebook developer account and create a new app in order to get the credentials. Please visit the official documentation : https://developers.facebook.com/docs/messenger-platform/getting-started

4. In order to teach your chatbot what to say/do, you will need to create a new hook. For a starting example, you can create a file under `api/hooks/hello/index.js` where you put :
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
See the "examples" folder for more.

## License
MIT
## Credits
[Freeways/messenger-bot-sails](https://github.com/Freeways/messenger-bot-sails) Boiletplate has been a starting point for this project.
The messenger handler's source code is a modified version [Charca/bootbot](https://github.com/Charca/bootbot) which is a powerful JavaScript Framework to build Facebook Messenger's Chat bots. Special thanks to [Maxi Ferreira](https://github.com/Charca) !
