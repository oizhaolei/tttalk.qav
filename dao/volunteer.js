var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('volunteer');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

var Gearman = require("node-gearman");
var gearman = new Gearman(config.gearman.server, config.gearman.port);

var cacheClient = require('../lib/ocs');

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

// http://211.149.218.190:5000/volunteer/qav_request?lang1=CN&lang2=EN&loginin=4638
exports.qavRequest = function(req, res, next) {
  var user_id = req.query.loginid;
  if (user_id.indexOf('u_') === 0) {
    user_id = user_id.substring(2);
  }
  var lang1 = req.query.lang1;
  var lang2 = req.query.lang2;

  // sql
  var sql = 'select qd.agent_emp_id, qd.last_online_time, emp.fullname, emp.tel from qav_devices qd, tbl_agent_emp emp inner join (select id from tbl_agent_store where ((lang1=? and lang2=?) or (lang1=? and lang2=?))) store on store.id=emp.agentstoreid where qd.agent_emp_id = emp.id and qd.busy=0 and qd.status ="online" order by qd.last_online_time desc limit 5';

  var args = [ lang1, lang2, lang2, lang1 ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = readonlyPool.query(sql, args, function(err, volunteers) {
    if (err) {
      logger.error(err);
      next(err);
    } else {
      var sqli = 'insert into tbl_conversation (user_id, from_lang, to_lang, create_date) values(?, ?, ?, utc_timestamp(3))';
      var argsi = [ user_id, lang1, lang2];
      var query = pool.query(sqli, argsi, function(err, result) {
        if (err) {
          logger.error(err);
          next(err);
        } else {
          var conversation_id = result.insertId;
          res.status(200).json({
            voice_fee : config.voiceFee,
            conversation_id : conversation_id,
            data : volunteers
          });

          if(volunteers.length > 0){
            // push notice to volunteers
            volunteers.forEach(function(item) {
              var message = {
                'user_id': item.agent_emp_id,
                'title' : 'qav_call',
                'content_id' : conversation_id,
                'app_name': 'volunteer'
              };
              logger.debug('push_message: %s', JSON.stringify(message));

              gearman.submitJob("push_message", JSON.stringify(message));
            });
            //caceh volunteers
            var key = "qav_request_volunteers_" + conversation_id;
            cacheClient.set(key, volunteers, 360, function(err) {
            });
          }

        }
      });

    }
  });
};
