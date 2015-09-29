Memcached = require('memcached');

var config = require('../config.js').config;
var ocs = config.aliyun.ocs;

var locations;
if (ocs.enabled) {
  locations = ocs.locations;
} else {
  locations = config.memcached;
}
var memcached = new Memcached(locations);

module.exports = memcached;
