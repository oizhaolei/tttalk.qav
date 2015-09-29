var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('user');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

// http://211.149.218.190:5000/volunteer/online?username=v_2074
exports.online = function(req, res, next) {
  var username = req.query.username;
  if (username.indexOf('v_') === 0) {
    username = username.substring(2);
  }
  // merge sql
  var sql = 'insert into qav_devices (agent_emp_id, last_online_time, status, create_date) values(?, utc_timestamp(3), "online", utc_timestamp(3)) ON DUPLICATE KEY UPDATE last_online_time = utc_timestamp(3), status="online"';
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

changeField = function(agent_emp_id, field, val, cb) {
    // merge sql
  var sql = 'update qav_devices set ' + field + ' = ? where agent_emp_id = ?';
  var args = [ val, agent_emp_id];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if(cb) cb(err, result);
  });
};
exports.changeField = changeField;

// http://211.149.218.190:5000/volunteer/offline?username=v_2074
exports.offline = function(req, res, next) {
  var username = req.query.username;
  if (username.indexOf('v_') === 0) {
    username = username.substring(2);
  }

  changeField(username, 'status', 'offline', function(err, result){
    if (err) {
      res.status(500).send("error");
    } else {
      res.status(200).send(username);
    }
  });
};

// http://211.149.218.190:5000/volunteer/qav_request?lang1=CN&lang2=EN
exports.qavRequest = function(req, res, next) {
  var user_id = req.query.loginid;
  var lang1 = req.query.lang1;
  var lang2 = req.query.lang2;
  if (user_id.indexOf('u_') === 0) {
    user_id = user_id.substring(2);
  }

  // update sql
  var sql = 'select qd.agent_emp_id, qd.last_online_time, emp.fullname, emp.tel from qav_devices qd, tbl_agent_emp emp inner join (select id from tbl_agent_store where ((lang1=? and lang2=?) or (lang1=? and lang2=?))) store on store.id=emp.agentstoreid where qd.agent_emp_id = emp.id and qd.status ="online" order by qd.last_online_time desc limit 5';

  var args = [ lang1, lang2, lang2, lang1 ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, data) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      var sqli = 'insert into tbl_conversation (user_id, from_lang, to_lang, create_id, create_date) values(?, ?, ?, ?, utc_timestamp(3))';
      var argsi = [ user_id, lang1, lang2, user_id ];
      var query = pool.query(sqli, argsi, function(err, result) {
        if (err) {
          logger.error(err);
          next(err);
        } else {
          var newId = result.insertId;
          res.status(200).json({
            conversation_id : newId,
            data : data
          });
          // TODO push notice to volunteers

        }
      });

    }
  });

};
