var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('conversation.js');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var cacheClient = require('../lib/ocs');

exports.insert_user_charge = function(user_id, delta, callback) {
  //TODO
  if (callback) callback(null);
};
exports.update_user_balance = function(user_id, delta, callback) {
  var sql = 'update tbl_user set balance = balance + ?, update_date = utc_timestamp(3) where id = ?';
  var args = [ delta, user_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      logger.error(err);
    } else {
      var user_key = "tbl_user_" + user_id;
      cacheClient.delete(user_key, function(err, data) {
        logger.error(err);
      });
    }
    if (callback) callback(err);
  });
};

exports.insert_agent_emp_charge = function(agent_emp_id, delta, callback) {
  //TODO
  if (callback) callback(null);
};
exports.update_agent_emp_balance = function(agent_emp_id, delta, callback) {
  var sql = 'update tbl_agent_emp set balance = balance + ?, update_date = utc_timestamp(3) where id = ?';
  var args = [ delta, agent_emp_id ];
  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      logger.error(err);
    } else {
      var agent_emp_key = "tbl_agent_emp_by_id_" + agent_emp_id;
      cacheClient.delete(agent_emp_key, function(err, data) {
        logger.error(err);
      });
    }
    if (callback) callback(err);
  });
};
