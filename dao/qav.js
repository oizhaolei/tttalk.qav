var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('qav');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var Gearman = require("node-gearman");
var gearman = new Gearman(config.gearman.server, config.gearman.port);

var cacheClient = require('../lib/ocs');

var volunteer = require('./volunteer.js');

// http://211.149.218.190:5000/conversation/begin?conversation_id=17&agent_emp_id=2074
exports.beginConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  var agent_emp_id = req.query.agent_emp_id;
  if (agent_emp_id.indexOf('v_') === 0) {
    agent_emp_id = agent_emp_id.substring(2);
  }

  var sql, args;
  //busy
  volunteer.changeField(agent_emp_id, 'busy', 1);

  sql = 'update tbl_conversation set agent_emp_id = ?, start_time = utc_timestamp(3), status = ? where id = ?';
  args = [ agent_emp_id, 'begin', conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).json({
        'success' : true
      });

      //push cancel notice to volunteers
      var key = "qav_request_volunteers_" + conversation_id;
      cacheClient.get(key, function(err, volunteers) {
        if (volunteers){
          volunteers.forEach(function(item) {
            if (item.agent_emp_id == agent_emp_id) return;

            var message = {
              'user_id': item.agent_emp_id,
              'title' : 'qav_call_cancel',
              'content_id' : conversation_id,
              'app_name': 'volunteer'
            };
            logger.debug('push_message: %s', JSON.stringify(message));

            gearman.submitJob("push_message", JSON.stringify(message));
          });

        }
      });
    }
  });
};

// http://211.149.218.190:5000/conversation/cancel?conversation_id=17
exports.cancelConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  findConversationByPK(conversation_id, function(err, result) {
    var conversation = result[0];
    var agent_emp_id = conversation.agent_emp_id;
    //busy
    volunteer.changeField(agent_emp_id, 'busy', 0);

    var sql = 'update tbl_conversation set status = ? where id = ?';
    var args = [ 'cancelrequest', conversation_id ];

    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
    var query = pool.query(sql, args, function(err, result) {
      if (err) {
        logger.error(err);
        next(err);
      } else {
        res.status(200).json({
          'success' : true
        });
      }
    });
  });
};

// http://211.149.218.190:5000/conversation/end?conversation_id=17
exports.endConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  findConversationByPK(conversation_id, function(err, result) {
    var conversation = result[0];
    var agent_emp_id = conversation.agent_emp_id;
    //busy
    volunteer.changeField(agent_emp_id, 'busy', 0);

    var sql = 'update tbl_conversation set end_time = utc_timestamp(3), status = ? where id = ?';
    var args = [ 'end', conversation_id ];

    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
    var query = pool.query(sql, args, function(err, result) {
      if (err) {
        logger.error(err);
        next(err);
      } else {
        res.status(200).json({
          'success' : true
        });
      }
    });
  });
};

findConversationByPK = function(conversation_id, cb) {
  //  sql
  var sql = 'select * from tbl_conversation  where id = ?';
  var args = [ conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, result) {
    if(cb) cb(err, result);
  });
};

// http://211.149.218.190:5000/charge/begin?conversation_id=100
exports.beginCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var sql = 'update tbl_conversation set status = ?, start_charge_time = utc_timestamp(3) where id= ?';
  var args = [ 'chargebegin', conversation_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).send({
        success : true
      });
    }
  });
};

// http://211.149.218.190:5000/charge/end?conversation_id=100&charge_length=11
exports.endCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var charge_length = req.query.charge_length;
  var sql = 'update tbl_conversation set status = ?, charge_length = ?, end_charge_time = utc_timestamp(3) where id= ?';
  var args = [ 'chargeend', charge_length, conversation_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).send({
        success : true
      });
    }
  });
};

// http://211.149.218.190:5000/charge/update?conversation_id=100&charge_length=11
exports.updateCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var charge_length = req.query.charge_length;
  var fee = config.voiceFee * charge_length;
  var translator_fee = config.voiceTranslatorFee * charge_length;
  var sql = 'update tbl_conversation set charge_length = ?, fee = ?, translator_fee = ? where id= ?';
  var args = [ charge_length, fee, translator_fee, conversation_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).send({
        success : true
      });
    }
  });
};

// http://211.149.218.190:5000/charge/confirm?conversation_id=100
exports.confirmCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  findConversationByPK(conversation_id, function(err, result) {
    if (result && result.length > 0) {
      var conversation = result[0];

      var charge_length = conversation.charge_length;
      // 计费方法实现{}
      var fee = config.voiceFee * charge_length;
      var translator_fee = config.voiceTranslatorFee * charge_length;
      var sql = 'update tbl_conversation set status = ? where id= ?';
      var args = [ 'charged', conversation_id ];
      logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
      var query = pool.query(sql, args, function(err, result) {
        if (err) {
          logger.error(err);
          next(err);
        } else {
          // 扣除用户费用
          // 翻译者增加翻译费
          updateFee(conversation_id, fee, translator_fee);
          res.status(200).send({
            success : true
          });
        }
      });
    }
  });

};

// http://211.149.218.190:5000/conversation/user_feedback?id=17&network_star=1&peer_star=1&comment=XXX
exports.user_feedback = function(req, res, next) {
  var conversation_id = req.query.id;
  var network_star = req.query.network_star;
  var peer_star = req.query.peer_star;
  var comment = req.query.comment;

  var isUser = true;
  var user_id = req.query.loginid;

  feedback(conversation_id, user_id, isUser, network_star, peer_star, comment, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).send({
        success : true
      });
    }
  });
};

// http://211.149.218.190:5000/conversation/translator_feedback?id=17&network_star=2&peer_star=2&comment=XXX
exports.translator_feedback = function(req, res, next) {
  var conversation_id = req.query.id;
  var network_star = req.query.network_star;
  var peer_star = req.query.peer_star;
  var comment = req.query.comment;

  var isUser = false;
  var agent_emp_id = req.query.loginid;

  feedback(conversation_id, agent_emp_id, isUser, network_star, peer_star, comment, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).send({
        success : true
      });
    }
  });
};

feedback = function(conversation_id, uid, isUser, network_star, peer_star, comment, cb) {
  var sql = 'update tbl_conversation set ';
  if (isUser) {
    sql += ' user_network_star = ?, user_translator_star = ?, user_comment = ?, user_comment_date=utc_timestamp(3) where id = ? and user_id =?';
  } else {
    sql += ' translator_network_star = ?, translator_user_star = ?, translator_comment = ?, translator_comment_date=utc_timestamp(3) where id = ? and agent_emp_id=?';
  }
  var args = [network_star, peer_star, comment, conversation_id, uid];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));

  var query = pool.query(sql, args, cb);
};

updateFee = function(conversation_id, fee, translator_fee) {
  findConversationByPK(conversation_id, function(err, result) {
    if (result && result.length > 0) {
      var conversation = result[0];
      var user_id = conversation.user_id;
      var translator_id = conversation.agent_emp_id;

      var userSql = 'update tbl_user set balance = balance - ?, update_date = utc_timestamp(3) where id = ?';
      var userArgs = [ fee, user_id ];
      var translatorSql = 'update tbl_agent_emp set balance = balance + ?, update_date = utc_timestamp(3) where id = ?';
      var translatorArgs = [ translator_fee, translator_id ];
      logger.debug('[sql:]%s, %s', userSql, JSON.stringify(userArgs));
      logger.debug('[sql:]%s, %s', translatorSql, JSON.stringify(translatorArgs));
      pool.query(userSql, userArgs, function(err, result) {
        if (err) {
          logger.error(err);
        }
      });
      pool.query(translatorSql, translatorArgs, function(err, result) {
        if (err) {
          logger.error(err);
        }
      });
    }
  });
};

exports.conversation = function(req, res, next) {
  var conversation_id = req.params.id;
  findConversationByPK(conversation_id, function(err, data) {
      if (data && data.length > 0) {
        data = data[0];
        res.status(200).send(data);
      } else {
        next(err);
      }
  });
};

exports.conversations = function(req, res, next) {
  var type = req.query.type;
  var loginid = req.query.loginid;

  //
  var sql;
  if (type == 'u') {
    sql = 'select * from tbl_conversation where user_id =? order by id desc limit 20';
  } else {
    sql = 'select * from tbl_conversation where agent_emp_id =? order by id desc limit 20';
  }

  var args = [ loginid ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, conversations) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      res.status(200).json(conversations);

    }
  });
};
