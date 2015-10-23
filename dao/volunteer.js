var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('volunteer.js');

var cacheClient = require('../lib/ocs');
var mail = require('../lib/mail');

var async = require('async');

var pool = mysql.createPool(config.mysql.ttt.main);
var readonlyPool = mysql.createPool(config.mysql.ttt.readonly1);

// http://ctalk3:4005/volunteer/online?loginid=2074

exports.online = function(req, res, next) {
  var agent_emp_id = req.query.loginid;
  // merge sql
  var sql = 'insert into qav_devices (agent_emp_id, last_online_time, status, create_date) values(?, utc_timestamp(3), "online", utc_timestamp(3)) ON DUPLICATE KEY UPDATE busy=0, last_online_time = utc_timestamp(3), status="online"';
  var args = [ agent_emp_id ];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).send({
        success : false,
        msg : err
      });
    } else {
      res.status(200).send({
        success : true
      });

      //memcache
      var key = 'qav_device_' + agent_emp_id;
      cacheClient.set(key, agent_emp_id, 360, function(err){
      });
    }
  });
};

exports.ping = function(req, res, next) {
  var agent_emp_id = req.query.loginid;
  logger.debug('ping: %s', agent_emp_id);

  //memcache
  var key = 'qav_device_' + agent_emp_id;
  cacheClient.set(key, agent_emp_id, 360, function(err){
  });
  res.status(200).send({
    success : true
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

// http://ctalk3:4005/volunteer/offline?loginid=2074
exports.offline = function(req, res, next) {
  var agent_emp_id = req.query.loginid;

  _offline(agent_emp_id, function(err, result) {
    if (!err && result.affectedRows === 0) err = 'no data change';

    if (err) {
      res.status(200).send({
        success : false,
        msg : err
      });
    } else {
      res.status(200).send({
        success : true
      });

      //memcache del
      var key = 'qav_device_' + agent_emp_id;
      cacheClient.del(key);
      //set offline status
      var offline_key = 'qav_offline_' + agent_emp_id;
      cacheClient.set(offline_key, agent_emp_id, 360, function(err){
      });
    }
  });
};

function _send_offline_mail(agent_emp_id, callback) {
  logger.debug('_send_offline_mail');
  var sql = 'select * from tbl_agent_emp where id = ?';
  var args = [ agent_emp_id];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, function(err, data){
    if (data && data.length > 0) {
      var agent_emp = data[0];
      var to = agent_emp.tel;
      var subject = 'It seems your qav are offline.';
      var content = 'offline: ' + to;
      mail.send(to, subject , content, function(){
      });
    }
  });
}

function _offline(agent_emp_id, callback) {
    // update sql
  var sql = 'update qav_devices set status = ?, busy = 0 where agent_emp_id = ?';
  var args = [ 'offline', agent_emp_id];

  logger.debug('[sql:]%s, %s', sql, JSON.stringify(args));
  var query = pool.query(sql, args, callback);
}

// http://ctalk3:4005/batch/online_check
exports.batch_online_check = function(req, res, next) {
  logger.info('online check');
  var sql = 'select * from qav_devices where status = "online"';
  logger.debug('[sql:]%s', sql);
  readonlyPool.query(sql, function(err, qav_devices) {
    logger.debug('qav_devices: %s', JSON.stringify(qav_devices));
    if (qav_devices && qav_devices.length > 0) {
      var online_count = 0;
      async.each(qav_devices, function(qav_device, callback) {
        var agent_emp_id = qav_device.agent_emp_id;
        var key = 'qav_device_' + agent_emp_id;
        cacheClient.get(key, function(err, data) {

          if (data) {
            online_count++;
          } else {
            _offline(agent_emp_id, function(err, result) {
            });
            _send_offline_mail(agent_emp_id, function(){
            });
          }

          callback(err);
        });
      }, function(err) {
        if( err ) {
          console.log('A volunteer failed to process');
        } else {
          if (online_count === 0) {
            var to = config.sales_managers;
            var subject = 'It seems all translator are just offline.';
            var content = subject;
            mail.send(to, subject , content, function(){
            });
          }
          console.log('All volunteers have been processed successfully');
        }
      });

    }
  });
  res.status(200).send({
    success : true
  });
};
