var config = require("../config").config;
var Gearman = require("node-gearman");
var gearman = new Gearman(config.gearman.server, config.gearman.port);
var logger = require('log4js').getLogger('conversation.js');


exports.send = function(email, subject, body, callback){
  var message = {
    email: email,
    subject: subject,
    body: body
  };

  logger.info('send email: ', message);
  var job = gearman.submitJob("send_email", JSON.stringify(message));

  job.setTimeout(60000);

  job.on("timeout", function(){
    logger.info('Timeout to send mail to %s', message.email);
    gearman.close();
    callback(true, 'timeout');
  });

  job.on("error", function(err){
    logger.info('failed to send mail to %s:%s', message.email, err.message);
    gearman.close();
    callback(err);
  });

  job.on("end", function(data){
    logger.info('successfully sent mail to %s', message.email);
    gearman.close();
    callback(null);
  });


};
