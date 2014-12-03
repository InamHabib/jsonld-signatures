/**
 * Test runner for JSON-LD Signatures library.
 *
 * @author Dave Longley <dlongley@digitalbazaar.com>
 * @author Manu Sporny <msporny@digitalbazaar.com>
 *
 * Copyright (c) 2014 Digital Bazaar, Inc. All rights reserved.
 */
(function() {

'use strict';

// detect node.js (vs. phantomJS)
var _nodejs = (typeof process !== 'undefined' &&
  process.versions && process.versions.node);

if(_nodejs) {
  var _jsdir = process.env.JSDIR || 'lib';
  var fs = require('fs');
  var path = require('path');
  var jsonld = require('../node_modules/jsonld');
  var jsigs = require('../' + _jsdir + '/jsonld-signatures')();
  var assert = require('assert');
  var program = require('commander');
  program
    .option('--bail', 'Bail when a test fails')
    .parse(process.argv);
} else {
  var fs = require('fs');
  var system = require('system');
  require('./setImmediate');
  var _jsdir = system.env.JSDIR || 'lib';
  var async = require('async');
  window.async = async;
  var forge = require('../node_modules/node-forge');
  window.forge = forge;
  require('../node_modules/jsonld');
  require('../' + _jsdir + '/jsonld-signatures');
  var jsigs = window.jsigs;
  window.Promise = require('es6-promise').Promise;
  var assert = require('chai').assert;
  require('mocha/mocha');
  require('mocha-phantomjs/lib/mocha-phantomjs/core_extensions');
  var program = {};
  for(var i = 0; i < system.args.length; ++i) {
    var arg = system.args[i];
    if(arg.indexOf('--') === 0) {
      var argname = arg.substr(2);
      switch(argname) {
      default:
        program[argname] = true;
      }
    }
  }

  mocha.setup({
    reporter: 'spec',
    ui: 'bdd'
  });
}

var testDocument = {
  "@context": {
    schema: 'http://schema.org/',
    name: 'schema:name',
    homepage: 'schema:url',
    image: 'schema:image'
  },
  name: 'Manu Sporny',
  homepage: 'https://manu.sporny.org/',
  image: 'https://manu.sporny.org/images/manu.png'
};

// run tests
describe('JSON-LD Signatures', function() {
  var testDocumentSigned = {};
  var testPublicKeyUrl = 'https://example.com/i/alice/keys/1';
  var testPublicKeyPem =
    '-----BEGIN PUBLIC KEY-----\r\n' +
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4R1AmYYyE47FMZgo708NhFU+t\r\n' +
    '+VWn133PYGt/WYmD5BnKj679YiUmyrC3hX6oZfo4eVpOkycxZvGgXCLQGuDp45Xf\r\n' +
    'Zkdsjqs3o62En4YjlHWxgeGmkiRqGfZ3sJ3u5WZ2xwapdZY3/2T/oOV5ri8SktTv\r\n' +
    'mVGCyhwFuJC/NbJMEwIDAQAB\r\n' +
    '-----END PUBLIC KEY-----';
  var testPrivateKeyPem = '-----BEGIN RSA PRIVATE KEY-----\r\n' +
    'MIICWwIBAAKBgQC4R1AmYYyE47FMZgo708NhFU+t+VWn133PYGt/WYmD5BnKj679\r\n' +
    'YiUmyrC3hX6oZfo4eVpOkycxZvGgXCLQGuDp45XfZkdsjqs3o62En4YjlHWxgeGm\r\n' +
    'kiRqGfZ3sJ3u5WZ2xwapdZY3/2T/oOV5ri8SktTvmVGCyhwFuJC/NbJMEwIDAQAB\r\n' +
    'AoGAZXNdPMQXiFGSGm1S1P0QYzJIW48ZCP4p1TFP/RxeCK5bRJk1zWlq6qBMCb0E\r\n' +
    'rdD2oICupvN8cEYsYAxZXhhuGWZ60vggbqTTa+4LXB+SGCbKMX711ZoQHdY7rnaF\r\n' +
    'b/Udf4wTLD1yAslx1TrHkV56OfuJcEdWC7JWqyNXQoxedwECQQDZvcEmBT/Sol/S\r\n' +
    'AT5ZSsgXm6xCrEl4K26Vyw3M5UShRSlgk12gfqqSpdeP5Z7jdV/t5+vD89OJVfaa\r\n' +
    'Tw4h9BibAkEA2Khe03oYQzqP1V4YyV3QeC4yl5fCBr8HRyOMC4qHHKQqBp2VDUyu\r\n' +
    'RBJhTqqf1ErzUBkXseawNxtyuPmPrMSl6QJAQOgfu4W1EMT2a1OTkmqIWwE8yGMz\r\n' +
    'Q28u99gftQRjAO/s9az4K++WSUDGkU6RnpxOjEymKzNzy2ykpjsKq3RoIQJAA+XL\r\n' +
    'huxsYVE9Yy5FLeI1LORP3rBJOkvXeq0mCNMeKSK+6s2M7+dQP0NBYuPo6i3LAMbi\r\n' +
    'yT2IMAWbY76Bmi8TeQJAfdLJGwiDNIhTVYHxvDz79ANzgRAd1kPKPddJZ/w7Gfhm\r\n' +
    '8Mezti8HCizDxPb+H8HlJMSkfoHx1veWkdLaPWRFrA==\r\n' +
    '-----END RSA PRIVATE KEY-----';
  var testPublicKey = {
    "@context": jsigs.SECURITY_CONTEXT_URL,
    '@id': testPublicKeyUrl,
    owner: 'https://example.com/i/alice',
    publicKeyPem: testPublicKeyPem
  };
  var testPublicKeyOwner = {
    "@context": jsigs.SECURITY_CONTEXT_URL,
    '@id': 'https://example.com/i/alice',
    publicKey: [testPublicKey]
  };

  it('should successfully sign a local document', function(done) {
    jsigs.sign(testDocument, {
      privateKeyPem: testPrivateKeyPem,
      creator: testPublicKeyUrl
    }, function(err, signedDocument) {
      assert.ifError(err);
      assert.notEqual(signedDocument.signature, undefined,
        'signature was not created');
      assert.equal(signedDocument.signature.creator, testPublicKeyUrl,
        'creator key for signature is wrong');
      testDocumentSigned = signedDocument;
      done();
    });
  });

  it('should successfully verify a local signed document', function(done) {
    jsigs.verify(testDocumentSigned, {
      publicKey: testPublicKey,
      publicKeyOwner: testPublicKeyOwner,
    }, function(err, verified) {
      assert.ifError(err);
      assert.equal(verified, true, 'signature verification failed');
      done();
    });
  });
});

if(!_nodejs) {
  mocha.run(function() {
    phantom.exit();
  });
}

})();
