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

// http://211.149.218.190:5000/conversation?username=liujiuyi&status=begin&user_id=u_100&agent_emp_id=v_200&from_lang=CN&to_lang=KR|oncall_id=100&end
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
    var oncall_id = req.query.oncall_id;
    var sql = 'update tbl_on_call set end_time = utc_timestamp(3) where id= ?';
    var args = [ oncall_id ];
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
  } else if (status == 'end') {
  }
  res.status(200).send({
    success : true
  });
}
