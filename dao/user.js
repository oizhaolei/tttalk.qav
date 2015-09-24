var util = require('util');
var config = require("../config.js").config;
var mysql = require('mysql');
var logger = require('log4js').getLogger('user');

var redis = require("redis");
var redisClient = redis.createClient(config.redis.port, config.redis.server,
    config.redis.options);
redisClient.on("error", function(err) {
  logger.error("Redis server error :", err);
});

// http://211.149.218.190:5000/online?username=liujiuyi
exports.online = function(req, res, next) {
  var username = req.query.username;
  redisClient.hset('translator_online', username, '1', function(error, res) {
    if (error) {
      console.log(error);
    } else {
      console.log(res);
    }

  });
  res.status(200).send(username);
};
// http://211.149.218.190:5000/offline?username=liujiuyi
exports.offline = function(req, res, next) {
  var username = req.query.username;
  redisClient.hdel('translator_online', username, function(error, res) {
    if (error) {
      console.log(error);
    } else {
      console.log(res);
    }
  });
  res.status(200).send(username);
};
// http://211.149.218.190:5000/onlines
exports.onlines = function(req, res, next) {
  redisClient.hgetall("translator_online", function(err, onlines) {
    res.status(200).send(Object.keys(onlines));
  });
}
