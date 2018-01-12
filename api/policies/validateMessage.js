/**
 * validateMessage
 *
 * @module      :: Policy
 * @description :: make sure that all needed fields exists
 *
 */

module.exports = function (req, res, next) {
  var data = req.allParams();
  if (data.object !== 'page') {
    sails.log.warn("Policy `validateMessage` : Missing Page!", data);
    return res.badRequest({err: "The page parameter is missing!"});
  }
  next();
}
