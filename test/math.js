var assert = require('assert');
var math = require('mathjs');

describe('ceil', function() {
  it('test ceil', function(done) {
    assert.equal(0, math.ceil(0 / 60));
    assert.equal(1, math.ceil(59 / 60));
    assert.equal(1, math.ceil(60 / 60));
    assert.equal(2, math.ceil(61 / 60));
    assert.equal(2, math.ceil(73 / 60));
    done();
  });
});
