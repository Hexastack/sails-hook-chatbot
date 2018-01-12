/**
 * ChatbotController
 *
 * @description :: Server-side logic for managing chatbot endpoints
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  webhook: function(req, res) {
    Chatbot.handle(req.allParams(), function(err) {
      if (err) {
        return res.serverError(err);
      }
      res.ok();
    });
  },
  subscribe: function(req, res) {
    Chatbot.subscribe(req.query, function(err, response) {
      if (err) {
        return res.serverError(err);
      }
      res.ok(response);
    });
  }
}
