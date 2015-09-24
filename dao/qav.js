var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('qav');
var pool = mysql.createPool(config.mysql.ttt.main);

var redis = require("redis");
var redisClient = redis.createClient(config.redis.port, config.redis.server,
    config.redis.options);
redisClient.on("error", function(err) {
  logger.error("Redis server error :", err);
});

// http://211.149.218.190:5000/conversation?username=liujiuyi&status=begin&user_id=u_100&agent_emp_id=v_200&from_lang=CN&to_lang=KR
// http://211.149.218.190:5000/conversation?username=liujiuyi&status=end&on_call_id=17
exports.conversation = function(req, res, next) {
  var username = req.query.username;
  var status = req.query.status;
  if (status == 'begin') {
    redisClient.hdel('translator_online', username, function(error, res) {
      if (error) {
        console.log(error);
      } else {
        console.log(res);
      }
    });
    var user_id = req.query.user_id;
    var agent_emp_id = req.query.agent_emp_id;
    var from_lang = req.query.from_lang;
    var to_lang = req.query.to_lang;
    var sql = 'insert into tbl_on_call (user_id, agent_emp_id, from_lang, to_lang, start_time, create_id, create_date) values(?,?,?,?,utc_timestamp(3),?, utc_timestamp(3))';
    var args = [ user_id.substring(2), agent_emp_id.substring(2), from_lang,
        to_lang, user_id.substring(2) ];
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
    var query = pool.query(sql, args, function(err, result) {
      if (err) {
        logger.error(err);
        next(err);
      } else {
        var newId = result.insertId;
        logger.debug('[onCallId:]%s', newId);
        res.status(200).send({
          'onCallId' : newId
        });
      }
    });
  } else if (status == 'end') {
    redisClient.hset('translator_online', username, '1', function(error, res) {
      if (error) {
        console.log(error);
      } else {
        console.log(res);
      }
    });
    var on_call_id = req.query.on_call_id;
    var sql = 'update tbl_on_call set end_time = utc_timestamp(3) where id= ?';
    var args = [ on_call_id ];
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
  }
}
// http://211.149.218.190:5000/charge?on_call_id=100&status=begin|end
exports.charge = function(req, res, next) {
  var on_call_id = req.query.on_call_id;
  var status = req.query.status;
  if (status == 'begin') {
    var sql = 'update tbl_on_call set start_charge_time = utc_timestamp(3) where id= ?';
    var args = [ on_call_id ];
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
  } else if (status == 'end') {
    var sql = 'update tbl_on_call set end_charge_time = utc_timestamp(3) where id= ?';
    var args = [ on_call_id ];
    logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
    var query = pool.query(sql, args, function(err, result) {
      if (err) {
        logger.error(err);
        next(err);
      } else {
        // 计费方法实现{}
        res.status(200).send({
          success : true
        });
      }
    });
  }
}
// http://211.149.218.190:5000/feedback?on_call_id=17&user_network_star=1&user_translate_star=1
// http://211.149.218.190:5000/feedback?on_call_id=17&translator_network_star=2&translator_translate_star=2
exports.feedback = function(req, res, next) {
  var on_call_id = req.query.on_call_id;
  var user_network_star = req.query.user_network_star;
  var user_translate_star = req.query.user_translate_star;
  var user_comment = req.query.user_comment;
  var translator_network_star = req.query.translator_network_star;
  var translator_translate_star = req.query.translator_translate_star;
  var translator_comment = req.query.translator_comment;

  var sql = 'select * from tbl_on_call_feedback where on_call_id = ?';
  var args = [ on_call_id ];
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      if (result && result.length > 0) {
        var updateSql = 'update tbl_on_call_feedback set ';
        var updateArgs = [];
        if (typeof (user_network_star) != "undefined") {
          updateArgs.push(user_network_star);
          updateSql += ' user_network_star = ?,';
        }
        if (typeof (user_translate_star) != "undefined") {
          updateArgs.push(user_translate_star);
          updateSql += ' user_translate_star = ?,';
        }
        if (typeof (user_comment) != "undefined") {
          updateArgs.push(user_comment);
          updateSql += ' user_comment = ?,';
        }
        if (typeof (translator_network_star) != "undefined") {
          updateArgs.push(translator_network_star);
          updateSql += ' translator_network_star = ?,';
        }
        if (typeof (translator_translate_star) != "undefined") {
          updateArgs.push(translator_translate_star);
          updateSql += ' translator_translate_star = ?,';
        }
        if (typeof (translator_comment) != "undefined") {
          updateArgs.push(translator_comment);
          updateSql += ' translator_comment = ?,';
        }
        updateArgs.push(on_call_id);
        updateSql += ' create_date=utc_timestamp(3) where on_call_id = ?';

        logger.debug('[sql:]%s, %s', updateSql, JSON.stringify(updateArgs));
        var query = pool.query(updateSql, updateArgs, function(err, result) {
          if (err) {
            logger.error(err);
            next(err);
          } else {
            res.status(200).send({
              success : true
            });
          }
        });
      } else {
        var insertSql = 'insert into tbl_on_call_feedback (';
        var insertSql2 = ' on_call_id, create_date) values (';
        var insertArgs = [];
        if (typeof (user_network_star) != "undefined") {
          insertSql += ' user_network_star,';
          insertArgs.push(user_network_star);
          insertSql2 += '?, ';
        }
        if (typeof (user_translate_star) != "undefined") {
          insertSql += ' user_translate_star,';
          insertArgs.push(user_translate_star);
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
        if (typeof (translator_translate_star) != "undefined") {
          insertSql += ' translator_translate_star,';
          insertArgs.push(translator_translate_star);
          insertSql2 += '?, ';
        }
        if (typeof (translator_comment) != "undefined") {
          insertSql += ' translator_comment,';
          insertArgs.push(translator_comment);
          insertSql2 += '?, ';
        }
        insertArgs.push(on_call_id);
        insertSql2 += '?, utc_timestamp(3))';

        logger.debug('[sql:]%s, %s', insertSql + insertSql2, JSON
            .stringify(insertArgs));
        var query = pool.query(insertSql + insertSql2, insertArgs, function(
            err, result) {
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
    }
  });
}
