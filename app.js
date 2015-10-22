var crypto = require('crypto');
var config = require('./config.js').config;
var volunteer = require('./dao/volunteer.js');
var qav = require('./dao/conversation.js');
var logger = require('log4js').getLogger('app');

var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.urlencoded({
  extended : true
}));
app.use(bodyParser.json());

app.all('/', function(req, res) {
  res.json({});
});

/**
 * check sign
 **/
checkSign = function(req, res, next) {
  logger.info();
  logger.info('----------- New Request ---------');
  logger.info('url = %s ', req.originalUrl);
  logger.info('query = %s', JSON.stringify(req.query));
  logger.info('body = %s', JSON.stringify(req.body));
  logger.info('---------------------------------');
  var loginid = req.query.loginid;
  var sign = req.query.sign;
  if (loginid !== null && sign !== null ) {
    var keyArray = [];
    for(var param in req.query) {
      keyArray.push(param);
    }
    keyArray.sort();

    var paramArray = [];
    paramArray.push(loginid);
    for(var i in keyArray) {
      var key = keyArray[i];
      var val = req.query[key];
      if (key != 'sign') {
        paramArray.push(key + val);
      }
    }
    paramArray.push(config.tttalk.secret);
    var shaSource = paramArray.join("");
    var shasum    = crypto.createHash('sha1');
    var newSign   = shasum.update(shaSource).digest('hex');
    if (sign == newSign) {
      next();
    } else {
      logger.debug('check sign error: %s, %s, %s', sign, shaSource, newSign);
      next(("invalid sign"));
    }
  } else {
    next(("invalid params"));
  }
};
app.use(checkSign);

//volunteer
app.get('/volunteer/ping', volunteer.ping);
app.get('/volunteer/online', volunteer.online);
app.get('/volunteer/offline', volunteer.offline);

app.get('/conversation/request', qav.requestConversation);
app.get('/conversation/cancel', qav.cancelConversation);

app.get('/conversation/begin', qav.beginConversation);
app.get('/conversation/end', qav.endConversation);
app.get('/conversations/:id', qav.conversation);
app.get('/conversations', qav.conversations);

app.get('/charge/begin', qav.beginCharge);
app.get('/charge/end', qav.endCharge);
//app.get('/charge/update', qav.updateCharge);
app.get('/charge/confirm', qav.confirmCharge);

app.get('/conversation/user_feedback', qav.user_feedback);
app.get('/conversation/translator_feedback', qav.translator_feedback);

app.get('/batch/online_check', volunteer.batch_online_check);
//app.get('/batch/uncharged_conversation', qav.batch_check_uncharged_conversation);

var server = app.listen(config.app_port, function() {
  logger.debug('Listening on port %d', server.address().port);
});
