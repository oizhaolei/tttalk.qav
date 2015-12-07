var async = require('async');
var config = require("../config.js").config;
var memcached = require('../lib/ocs');

console.log(Date.now());
var keys = [];
for(var i=0;i<100;i++) {
  keys.push('key_' + i);
}


for (var i in keys) {
  var key = keys[i];
  memcached.set(key, key + '_value', 100, function(err, data) {
    if (err) console.log(err);
  });
}

memcached.getMulti(keys, function(err, data) {
  if (err) console.log(err);
  // memcached.end();
  console.dir(data);

  console.log(data[keys[3]]);

});


async.each(keys, function(key, callback){
  memcached.get(key, function(err, data){
    console.dir(data);
    callback();
  });
}, function(err){
  memcached.end();
  console.log(Date.now());
});
