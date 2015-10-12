var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('conversation.js');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var cacheClient = require('../lib/ocs');

var volunteer = require('./volunteer.js');
var fee = require('./fee.js');


exports.insert_user_charge = function(user_id, delta) {
  //TODO
};
exports.update_user_balance = function(user_id, delta) {
  var sql = 'update tbl_user set balance = balance + ?, update_date = utc_timestamp(3) where id = ?';
  var args = [ delta, user_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
    } else {
      var user_key = "tbl_user_" + userid;
      cacheClient.delete(user_key);
    }
  });
};

exports.insert_agent_emp_charge = function(agent_emp_id, delta) {
  //TODO
};
exports.update_agent_emp_balance = function(agent_emp_id, delta) {
  var sql = 'update tbl_agent_emp set balance = balance + ?, update_date = utc_timestamp(3) where id = ?';
  var args = [ delta, agent_emp_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  pool.query(sql, args, function(err, result) {
    if (err) {
      logger.error(err);
    } else {
      var agent_emp_key = "tbl_agent_emp_by_id_" + agent_emp_id;
      cacheClient.delete(agent_emp_key);
    }
  });
};

/**
 * 定期处理batch
 */
exports.batch_check_uncharged_conversation = function(req, res, next) {
  //
  var dSql = 'select date_sub(utc_timestamp(3), INTERVAL 24 hour) startDate, date_sub(utc_timestamp(3), INTERVAL 0 hour) endDate';
  readonlyPool.query(dSql, function(err, result) {
    if (result && result.length > 0) {
      var row = result[0];
      var startDate = row.startDate;
      var endDate = row.endDate;
      var sql = 'select * from tbl_conversation where charge_length > 0 and status in ("end", "chargeend") and create_date between ? and ? limit 20';
      var args = [ startDate, endDate ];

      logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
      var query = readonlyPool.query(sql, args, function(err, conversations) {
        logger.debug('conversations: %s', JSON.stringify(conversations));
      });

    }
  });
};
