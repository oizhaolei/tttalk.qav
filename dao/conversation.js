var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('conversation.js');

var math = require('mathjs');
var async = require('async');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var volunteer = require('./volunteer.js');
var fee_dao = require('./fee_dao.js');


// http://211.149.218.190:5000/conversion/request?lang1=CN&lang2=EN&loginin=4638
exports.requestConversation = function(req, res, next) {
  var user_id = req.query.loginid;
  var lang1 = req.query.lang1;
  var lang2 = req.query.lang2;

  var sql1 = "select balance from tbl_user a where a.id = ?";
  var args1 = [ user_id ];
  logger.debug('[sql:]%s, %s', sql1, JSON.stringify(args1));
  pool.query(sql1, args1, function(err, result) {
    var balance = 0;
    if (!err && result && result.length > 0 ) {
      balance = result[0].balance;
    }
    if (balance < 2000) {
      res.status(200).json({
        success : false,
        msg : 'balance2000'
      });
    } else {
      // sql
      var sql = 'select qd.agent_emp_id, qd.last_online_time, emp.fullname, emp.tel, emp.pic_url from qav_devices qd, tbl_agent_emp emp inner join (select id from tbl_agent_store where ((lang1=? and lang2=?) or (lang1=? and lang2=?))) store on store.id=emp.agentstoreid where qd.agent_emp_id = emp.id and emp.call_permissions=1 and qd.busy=0 and qd.status ="online" order by qd.last_online_time desc limit 5';

      var args = [ lang1, lang2, lang2, lang1 ];

      logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
      var query = readonlyPool.query(sql, args, function(err, volunteers) {
        if (err) {
          res.status(200).json({
            success : false,
            msg : err
          });
        } else {
          var sqli = 'insert into tbl_conversation (user_id, from_lang, to_lang, create_date) values(?, ?, ?, utc_timestamp(3))';
          var argsi = [ user_id, lang1, lang2];
          var query = pool.query(sqli, argsi, function(err, result) {
            if (!err && result.affectedRows === 0) err = 'no data change';

            if (err) {
              res.status(200).json({
                success : false,
                msg : err
              });
            } else {
              var conversation_id = result.insertId;
              res.status(200).json({
                success : true,
                conversation_id : conversation_id,
                data : volunteers
              });

            }
          });

        }
      });
    }
  });

};

// http://211.149.218.190:5000/conversation/begin?conversation_id=17&agent_emp_id=2074
exports.beginConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var agent_emp_id = req.query.agent_emp_id;

  var sql, args;

  sql = 'update tbl_conversation set agent_emp_id = ?, start_time = utc_timestamp(3), status = "begin" where id = ? and status in ("request")';
  args = [ agent_emp_id, conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      //busy
      volunteer.changeField(agent_emp_id, 'busy', 1);

      res.status(200).json({
        'success' : true
      });
    }
  });
};

// http://211.149.218.190:5000/conversation/cancel?conversation_id=17
exports.cancelConversation = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  findConversationByPK(conversation_id, function(err, result) {
    var conversation = result[0];
    if (conversation.agent_emp_id) {
      //busy
      volunteer.changeField(conversation.agent_emp_id, 'busy', 0);
    }

    var sql = 'update tbl_conversation set status = "cancelrequest" where id = ? and status in ("request")';
    var args = [ conversation_id ];

    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
    var query = pool.query(sql, args, function(err, result) {
      if (!err && result.affectedRows === 0) err = 'no data change';

      if (err) {
        res.status(200).json({
          success : false,
          msg : err
        });
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
  });

  var sql = 'update tbl_conversation set end_time = utc_timestamp(3), status = "end" where id = ? and status in ("begin", "chargebegin", "chargeend")';
  var args = [ conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      res.status(200).json({
        'success' : true
      });
    }
  });
};

findConversationByPK = function(conversation_id, callback) {
  //  sql
  var sql = 'select * from tbl_conversation  where id = ?';
  var args = [ conversation_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, result) {
    if(callback) callback(err, result);
  });
};

// http://211.149.218.190:5000/charge/begin?conversation_id=100
exports.beginCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var sql = 'update tbl_conversation set status = "chargebegin", start_charge_time = utc_timestamp(3) where id= ? and status in ("begin")';
  var args = [ conversation_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).json({
        success : false,
        msg : err,
        balance : balance
      });
    } else {
      var sql1 = "select balance from tbl_user a, tbl_conversation b where a.id = b.user_id and b.id = ?";
      var args1 = [ conversation_id ];
      logger.debug('[sql:]%s, %s', sql1, JSON.stringify(args1));
      var query = pool.query(sql1, args1, function(err, result) {
        var balance = 0;
        if (!err && result && result.length > 0 ) {
          balance = result[0].balance;
        }
        res.status(200).json({
          success : true,
          balance : balance
        });
      });
    }
  });
};

// http://211.149.218.190:5000/charge/end?conversation_id=100&charge_length=11
exports.endCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;

  findConversationByPK(conversation_id, function(err, result) {
    var conversation = result[0];
    var agent_emp_id = conversation.agent_emp_id;
    //busy
    volunteer.changeField(agent_emp_id, 'busy', 0);
  });

  var charge_length = req.query.charge_length;
  var sql = 'update tbl_conversation set status = "chargeend", charge_length = ?, end_charge_time = utc_timestamp(3) where id= ? and status in ("begin", "end", "chargebegin")';
  var args = [ charge_length, conversation_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      res.status(200).json({
        success : true
      });
    }
  });
};

// 根据秒数，得到用户费用，按分钟计费，不足1分钟的部分记1分钟
function getUserFee(charge_seconds) {
  return config.voiceFeePerMinute * math.ceil(charge_seconds / 60 );
}

// 根据秒数，得到翻译者费用，按分钟计费，不足1分钟的部分记1分钟
function getTranslatorFee(charge_seconds) {
  return config.voiceTranslatorFeePerMinute * math.ceil(charge_seconds / 60 );
}

// http://211.149.218.190:5000/charge/confirm?conversation_id=100&charge_leng=11
exports.confirmCharge = function(req, res, next) {
  var conversation_id = req.query.conversation_id;
  var charge_length = req.query.charge_length;

  findConversationByPK(conversation_id, function(err, result) {
    if (result && result.length > 0) {
      var conversation = result[0];

      if (conversation.status === 'end' || conversation.status === 'chargeend') {
        _conversationCharge(conversation, charge_length, function(err) {
          if (err) {
            res.status(200).json({
              success : false,
              msg : err
            });
          } else {
            res.status(200).json({
              success : true
            });
          }
        });
      }
    }
  });
};

_conversationCharge = function(conversation, charge_length, callback) {
  var conversation_id = conversation.id;
  var user_id = conversation.user_id;
  var agent_emp_id = conversation.agent_emp_id;

  // 计费方法实现
  var fee = getUserFee(charge_length);
  var translator_fee = getTranslatorFee(charge_length);

  async.parallel([
    function(callback) {
      // 扣除用户费用
      fee_dao.insert_user_charge(user_id, fee * -1, function(err){
        callback(err, 'insert_user_charge');
      });
    }, function(callback){
      fee_dao.update_user_balance(user_id, fee * -1, function(err){
        callback(err, 'update_user_balance');
      });
    }, function(callback){
      // 翻译者增加翻译费
      fee_dao.insert_agent_emp_charge(agent_emp_id, translator_fee, function(err){
        callback(err, 'insert_agent_emp_charge');
      });
    }, function(callback){
      fee_dao.update_agent_emp_balance(agent_emp_id, translator_fee, function(err){
        callback(err, 'update_agent_emp_balance');
      });
    }
  ], function(e, results) {
    if (results.length == 4) {
      // 计费方法实现
      var sql = 'update tbl_conversation set charge_length = ?, fee = ?, translator_fee = ?, status = "charged" where id= ? and status in ("end", "chargeend")';
      var args = [ charge_length, fee, translator_fee, conversation_id ];
      logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
      var query = pool.query(sql, args, function(err, result) {
        if (callback) callback(err, result);
      });
    } else {
      if (callback) callback(e);
    }
  });
};

// http://211.149.218.190:5000/conversation/user_feedback?id=17&network_star=1&peer_star=1&comment=XXX
exports.user_feedback = function(req, res, next) {
  var conversation_id = req.body.id;
  var network_star = req.body.network_star;
  var peer_star = req.body.peer_star;
  var comment = req.body.comment;

  var isUser = true;
  var user_id = req.query.loginid;
  if (!user_id) user_id = req.body.loginid;

  feedback(conversation_id, user_id, isUser, network_star, peer_star, comment, function(err, result) {
    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      res.status(200).json({
        success : true
      });
    }
  });
};

// http://211.149.218.190:5000/conversation/translator_feedback?id=17&network_star=2&peer_star=2&comment=XXX
exports.translator_feedback = function(req, res, next) {
  var conversation_id = req.body.id;
  var network_star = req.body.network_star;
  var peer_star = req.body.peer_star;
  var comment = req.body.comment;

  var isUser = false;
  var agent_emp_id = req.query.loginid;

  feedback(conversation_id, agent_emp_id, isUser, network_star, peer_star, comment, function(err, result) {
    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      res.status(200).json({
        success : true
      });
    }
  });
};

feedback = function(conversation_id, uid, isUser, network_star, peer_star, comment, callback) {
  var sql = 'update tbl_conversation set ';
  if (isUser) {
    sql += ' user_network_star = ?, user_translator_star = ?, user_comment = ?, user_comment_date=utc_timestamp(3) where id = ? and user_id =? and user_translator_star = 0';
  } else {
    sql += ' translator_network_star = ?, translator_user_star = ?, translator_comment = ?, translator_comment_date=utc_timestamp(3) where id = ? and agent_emp_id=? and translator_user_star = 0';
  }
  var args = [network_star, peer_star, comment, conversation_id, uid];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));

  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (callback) callback(err, result);
  });
};

exports.conversation = function(req, res, next) {
  var conversation_id = req.params.id;
  findConversationByPK(conversation_id, function(err, data) {
    if (data && data.length > 0) {
      data = data[0];
      res.status(200).json(data);
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
    sql = 'select * from tbl_conversation where user_id = ? order by id desc limit 20';
  } else {
    sql = 'select * from tbl_conversation where agent_emp_id = ? order by id desc limit 20';
  }

  var args = [ loginid ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, conversations) {
    if (err) {
      res.status(200).json({
        success : false,
        msg : err
      });
    } else {
      res.status(200).json(conversations);

    }
  });
};
