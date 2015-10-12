var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('conversation.js');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var cacheClient = require('../lib/ocs');

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
