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
  var conversation_id = req.query.agent_emp_id;

  var agent_emp_id = req.query.volunteer_id;
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
            if (item.agent_emp_id === agent_emp_id) return;

            message = {
              'user_id': item.agent_emp_id,
              'title' : 'qav_call_cancel',
              'content_id' : conversation_id,
              'app_name': 'volunteer'
            };

            gearman.submitJob("push_message", JSON.stringify(message));
          });

        }
      });
    }
  });
};

// http://211.149.218.190:5000/conversation/end?conversation_id=17
exports.endConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  findConversationByPK(conversation_id, function(err, result) {
    var data = result[0];
    var agent_emp_id = data.agent_emp_id;
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

  var sql = 'update tbl_conversation set charge_length = ? where id= ?';
  var args = [ charge_length, conversation_id ];
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
      var sql = 'update tbl_conversation set status = ?, fee = ?, translator_fee = ? where id= ?';
      var args = [ 'charged', fee, translator_fee, conversation_id ];
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

findConversationFeedbackByPK = function(conversation_id, cb) {
  //  sql
  var sql = 'select * from tbl_conversation_feedback  where conversation_id = ?';
  var args = [ conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query =readonlyPool.query(sql, args, function(err, result) {
    if(cb) cb(err, result);
  });
};

// http://211.149.218.190:5000/feedback?conversation_id=17&user_network_star=1&user_translator_star=1
// http://211.149.218.190:5000/feedback?conversation_id=17&translator_network_star=2&translator_user_star=2
exports.feedback = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var user_network_star = req.query.user_network_star;
  var user_translator_star = req.query.user_translator_star;
  var user_comment = req.query.user_comment;
  var translator_network_star = req.query.translator_network_star;
  var translator_user_star = req.query.translator_user_star;
  var translator_comment = req.query.translator_comment;

  findConversationFeedbackByPK(conversation_id, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      var sql, args;
      if (result && result.length > 0) {
        var updateSql = 'update tbl_conversation_feedback set ';
        var updateArgs = [];
        if (typeof (user_network_star) != "undefined") {
          updateArgs.push(user_network_star);
          updateSql += ' user_network_star = ?,';
        }
        if (typeof (user_translator_star) != "undefined") {
          updateArgs.push(user_translator_star);
          updateSql += ' user_translator_star = ?,';
        }
        if (typeof (user_comment) != "undefined") {
          updateArgs.push(user_comment);
          updateSql += ' user_comment = ?,';
        }
        if (typeof (translator_network_star) != "undefined") {
          updateArgs.push(translator_network_star);
          updateSql += ' translator_network_star = ?,';
        }
        if (typeof (translator_user_star) != "undefined") {
          updateArgs.push(translator_user_star);
          updateSql += ' translator_user_star = ?,';
        }
        if (typeof (translator_comment) != "undefined") {
          updateArgs.push(translator_comment);
          updateSql += ' translator_comment = ?,';
        }
        updateArgs.push(conversation_id);
        updateSql += ' create_date=utc_timestamp(3) where conversation_id = ?';

        logger.debug('[sql:]%s, %s', updateSql, JSON.stringify(updateArgs));
        sql = updateSql;
        args = updateArgs;
      } else {
        var insertSql = 'insert into tbl_conversation_feedback (';
        var insertSql2 = ' conversation_id, create_date) values (';
        var insertArgs = [];
        if (typeof (user_network_star) != "undefined") {
          insertSql += ' user_network_star,';
          insertArgs.push(user_network_star);
          insertSql2 += '?, ';
        }
        if (typeof (user_translator_star) != "undefined") {
          insertSql += ' user_translator_star,';
          insertArgs.push(user_translator_star);
          insertSql2 += '?, ';
        }
        if (typeof (user_comment) != "undefined") {
          insertSql += ' user_comment,';
          insertArgs.push(user_comment);
          insertSql2 += '?, ';
        }
        if (typeof (translator_network_star) != "undefined") {
          insertSql += ' translator_network_star,';
          insertArgs.push(translator_network_star);
          insertSql2 += '?, ';
        }
        if (typeof (translator_user_star) != "undefined") {
          insertSql += ' translator_user_star,';
          insertArgs.push(translator_user_star);
          insertSql2 += '?, ';
        }
        if (typeof (translator_comment) != "undefined") {
          insertSql += ' translator_comment,';
          insertArgs.push(translator_comment);
          insertSql2 += '?, ';
        }
        insertArgs.push(conversation_id);
        insertSql2 += '?, utc_timestamp(3))';

        logger.debug('[sql:]%s, %s', insertSql + insertSql2, JSON
                     .stringify(insertArgs));
        sql = insertSql + insertSql2;
        args = insertArgs;
      }
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
    }
  });
};

// http://211.149.218.190:5000/feedbacks?type=1&agent_emp_id=2071
exports.feedbacks = function(req, res, next) {
  var args = [];
  var sqlWhere = "";
  var type = req.query.type;// 1:user2:tranlsator
  if (type == 1) {
    var agent_emp_id = req.query.agent_emp_id;
    args.push(agent_emp_id);
    sqlWhere += " a.agent_emp_id = ?";
  } else {
    var user_id = req.query.user_id;
    args.push(user_id);
    sqlWhere += " a.user_id = ?";
  }
  var sql = 'select a.*, b.user_network_star, b.user_translator_star, b.user_comment, b.translator_network_star, b.translator_user_star, b.translator_comment from tbl_conversation a left join tbl_conversation_feedback b on a.id = b.conversation_id where' + sqlWhere + ' order by a.id desc limit ' + config.rowsPerPage;

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  readonlyPool.query(sql, args, function(err, feedbacks) {
    logger.debug(JSON.stringify(feedbacks));
    res.status(200).send(feedbacks);
  });
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

exports.detailConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  findConversationByPK(conversation_id, function(err, data) {
      if (data && data.length > 0) {
        data = data[0];
        res.status(200).send(data);
      } else {
        next(err);
      }
  });
};
