'use strict';

require('comfychair/jasmine');
var comfy = require('comfychair');

var csp = require('../dist/index');
var channel = require('./helpers/channel_helpers');


describe('a channel with a standard buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(channel.implementation(channel.CHECKED))
      .toConformTo(channel.model(channel.CHECKED));
  });
});


describe('a channel with a dropping buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(channel.implementation(channel.DROPPING))
      .toConformTo(channel.model(channel.DROPPING));
  });
});


describe('a channel with a sliding buffer', function() {
  it('conforms to the appropriate channel model', function() {
    expect(channel.implementation(channel.SLIDING))
      .toConformTo(channel.model(channel.SLIDING));
  });
});
