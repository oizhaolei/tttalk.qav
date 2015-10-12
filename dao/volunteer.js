var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('volunteer.js');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

// http://211.149.218.190:5000/volunteer/online?loginid=2074

exports.online = function(req, res, next) {
  var agent_emp_id = req.query.loginid;
  if (agent_emp_id.indexOf('v_') === 0) {
    agent_emp_id = agent_emp_id.substring(2);
  }
  // merge sql
  var sql = 'insert into qav_devices (agent_emp_id, last_online_time, status, create_date) values(?, utc_timestamp(3), "online", utc_timestamp(3)) ON DUPLICATE KEY UPDATE busy=0, last_online_time = utc_timestamp(3), status="online"';
  var args = [ agent_emp_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(agent_emp_id);
    }
  });
};

changeField = function(agent_emp_id, field, val, cb) {
    // update sql
  var sql = 'update qav_devices set ' + field + ' = ? where agent_emp_id = ?';
  var args = [ val, agent_emp_id];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if(cb) cb(err, result);
  });
};
exports.changeField = changeField;

// http://211.149.218.190:5000/volunteer/offline?loginid=2074
exports.offline = function(req, res, next) {
  var agent_emp_id = req.query.loginid;
  if (agent_emp_id.indexOf('v_') === 0) {
    agent_emp_id = agent_emp_id.substring(2);
  }

  // update sql
  var sql = 'update qav_devices set status = ?, busy = 0 where agent_emp_id = ?';
  var args = [ 'offline', agent_emp_id];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(agent_emp_id);
    }
  });
};
