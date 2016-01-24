'use strict';


var Ajv = require('./ajv')
  , should = require('./chai').should();


describe('async schemas, formats and keywords', function() {
  var ajv, fullAjv;

  beforeEach(function () {
    ajv = Ajv();
    fullAjv = Ajv({ allErrors: true });
  });

  describe('async schemas without async elements', function() {
    it('should pass result via callback in setTimeout', function (done) {
      var schema = {
        $async: true,
        type: 'string',
        maxLength: 3
      };

      test(ajv, function() {
        test(fullAjv, done);
      });

      function test(ajv, cb) {
        var called = false;
        var validate = ajv.compile(schema);
        validate('abc', shouldBeValid (function() {
          called = true;
          validate('abcd', shouldBeInvalid (function () {
            validate(1, shouldBeInvalid (cb));
          }));
        }));
        called .should.equal(false);
      }
    });

    it('should fail compilation if async schema is inside sync schema', function() {
      var schema = {
        properties: {
          foo: {
            $async: true,
            type: 'string',
            maxLength: 3
          }
        }
      };

      should.throw(function() {
        ajv.compile(schema);
      });

      schema.$async = true;

      ajv.compile(schema);
    });
  });


  describe('async formats', function() {
    it('should return validation result via callback', function (done) {
      var schema = {
        $async: true,
        type: 'string',
        format: 'english_word',
        minimum: 5
      };

      test(ajv, function() {
        test(fullAjv, done);
      });

      function test(ajv, cb) {
        ajv.addFormat('english_word', {
          async: true,
          validate: checkWordOnServer
        });

        var validate = ajv.compile(schema);
        validate('tomorrow', shouldBeValid (function() {
          validate('manana', shouldBeInvalid (function () {
            validate(1, shouldBeInvalid (cb));
          }));
        }));
      }

      function checkWordOnServer(str, cb) {
        if (str == 'tomorrow') cb(null, true);
        else if (str == 'manana') cb(null, false);
        else cb(new Error('unknown word'));
      }
    });
  });
});


function shouldBeValid(func) {
  return function (err, valid) {
    should.equal(err, null);
    valid .should.equal(true);
    func();
  }
}


function shouldBeInvalid(func) {
  return function (err, valid) {
    err .should.be.instanceof(Error);
    err.errors .should.be.an('array');
    err.validation .should.equal(true);
    valid .should.equal(false);
    func();
  }
}
