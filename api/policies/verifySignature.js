/**
 * verifySignature
 *
 * @module      :: Policy
 * @description :: Verify the Request's Signature
 *
 */

var crypto = require('crypto');

module.exports = function (req, res, next) {
  var signature = req.headers['x-hub-signature'];
  if (!signature) {
    sails.log.warn("Policy `verifySignature` : Couldn't validate the request signature.");
    return res.serverError({err: "Couldn't validate the request signature."});
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];
    var expectedHash = crypto.createHmac('sha1', sails.config.bot.messenger.appSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signatureHash != expectedHash) {
      sails.log.warn("Policy `verifySignature` : Couldn't match the request signature.");
      return res.serverError({err: "Couldn't match the request signature."});
    }
  }
  sails.log.debug("Policy `verifySignature` : Request signature has been validated.");
  next();
}
