Memcached = require('memcached');

var config = require('../config.js').config;

var locations = config.memcached;
var memcached = new Memcached(locations);

module.exports = memcached;
