var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('user');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

// http://211.149.218.190:5000/volunteer/online?username=v_2435
exports.online = function(req, res, next) {
  var username = req.query.username;
  if (username.indexOf('v_') === 0) {
    username = username.substring(2);
  }
  // merge sql
  var sql = 'insert into qav_devices (agent_emp_id, last_online_time, status, create_date) values(?, utc_timestamp(3), "online", utc_timestamp(3)) ON DUPLICATE KEY UPDATE last_online_time = utc_timestamp(3) and status="online"';

  var args = [ username ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(username);
    }
  });
};

// http://211.149.218.190:5000/volunteer/offline?username=v_2435
exports.offline = function(req, res, next) {
  var username = req.query.username;
  if (username.indexOf('v_') === 0) {
    username = username.substring(2);
  }
  // update sql
  var sql = 'update qav_devices set status ="offline" where agent_emp_id = ?';

  var args = [ username ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(username);
    }
  });
};

// http://211.149.218.190:5000/volunteer/qav_request?lang1=CN&lang2=KR
exports.onlines = function(req, res, next) {
  var lang1 = req.query.lang1;
  var lang2 = req.query.lang2;
  // update sql
  var sql = 'select qd.agent_emp_id, qd.last_online_time, emp.fullname, emp.tel from qav_devices qd, tbl_agent_emp emp inner join (select id from tbl_agent_store where ((lang1=? and lang2=?) or (lang1=? and lang2=?))) store on store.id=emp.agentstoreid where qd.agent_emp_id = emp.id and qd.status ="online" order by qd.last_online_time desc limit 5';

  var args = [ lang1, lang2, lang2, lang1 ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, data) {
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(data);
    }
  });

};
