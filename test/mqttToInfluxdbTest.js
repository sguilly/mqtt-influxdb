/**
 * Created by sguilly on 03/12/14.
 */
/*jshint expr: true, unused: false*/
/*global describe, it, before, after, not */

var assert = require('assert');

var mqttInfluxdb = require('../lib/mqtt-influxdb');

var bunyan = require('bunyan');

var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var mosca = require('mosca');

var ascoltatore = {
  type: 'memory'
};

var settings = {
  port: 1883,
  backend: ascoltatore
};

var logger = bunyan.createLogger({
  name: 'mochacli',
  streams: [
    {
      level: 'error',
      type: 'raw',
      stream: prettyStdOut
    }]
});

var opts = {
  logger: bunyan.createLogger({
    name: 'mqtt-influxdb',
    streams: [
      {
        level: 'error',
        type: 'raw',
        stream: prettyStdOut
      }]
  }),
  mqtt: {
    ip: 'localhost',
    port: 1883, // tcp
    topic: 'mqtt-zibase/#',
    clientId: 'mqtt-influxdb',
    subscribe: ['mqtt-teleinfo/#', 'mqtt-zibase/#'],
    qos: 1 // 0 : without persistence and no ACK | 1 : with offline mode and ACK
  },
  influx: {
    host: '188.213.25.148',
    port: 8086, // optional, default 8086
    username: 'root',
    password: 'root',
    database: 'timeseriesTest'
  },
  decoder: {
    idKeys: ['id'],
    timeKeys: ['time', 'date'],
    denyKeys: ['itemToDeny'],
    transform: {tem: 'temperature', hum: 'humidity'},
    allowString: false
  }
};

var serverMqtt; // To simulate the broker
var clientMqtt; // To emit new events

describe('#start mqtt server', function () {
  it('should receive ready', function (done) {


    serverMqtt = new mosca.Server(settings);

    serverMqtt.on('clientConnected', function (client) {
      logger.info('client connected', client.id);
    });

    serverMqtt.on('ready', function () {
      logger.info('mosca server ready');
      done();
    });
  });
});

describe('#start influxdb client', function () {

  it('should create a temp database', function (done) {


    var influx = require('influx');
    var clientInflux = influx(opts.influx);

    assert(clientInflux instanceof influx.InfluxDB);

    clientInflux.getDatabaseNames(function (err,array){

      logger.trace('array=', array);

      if (array.indexOf(opts.influx.database) === -1)
      {
        clientInflux.createDatabase(opts.influx.database, function(err)
        {
          if (err) {
            logger.error('err=', err);
          }
          assert.equal(err, null);

          setTimeout(function () {
            done();

          }, 1000);

        });
      }
      else
      {
        logger.info('delete database');
        clientInflux.deleteDatabase(opts.influx.database, function(err)
        {
          logger.info('create database');
          clientInflux.createDatabase(opts.influx.database, function(err)
          {

            if (err) {
              logger.error('err=', err);
            }
            assert.equal(err, null);

            setTimeout(function () {
              done();

            }, 1000);

          });
        });
      }

    });

  });
});


describe('#start mqtt-influxdb bridge', function () {

  before(function (done) {
    var mqtt = require('mqtt');

    clientMqtt = mqtt.createClient(1883, 'localhost', {
      clean: false,
      encoding: 'utf8',
      clientId: 'testMqtt'
    });

    clientMqtt.on('connect', function(){

      done();
    });

    var consumer = mqttInfluxdb(opts);

    consumer.open();
  });


  it('should receive a connect event', function (done) {

    done();

  });

});

describe('#generate OS01 & OS02 event -> wait 35s and query influxdb', function () {

  this.timeout(35000);

  var clientInflux;

  before(function (done) {
    var influx = require('influx');
    clientInflux = influx(opts.influx);

    clientMqtt.publish('mqtt-zibase/1', JSON.stringify({id: 'OS01', itemToDeny: true, tem: 20}));

    clientMqtt.publish('mqtt-zibase/2', JSON.stringify({id: 'OS02', time: new Date(), tem: 14.5}));

    setTimeout(function () {


      done();

    }, 30000);
  });

  it('should read series from the database', function (done) {
    clientInflux.query('list series;', function (err, res) {

      logger.trace('-----------');
      logger.trace('list series');
      logger.trace('err', err);
      logger.trace('res=', res);

      assert.equal(err, null);
      assert(res instanceof Array);
      assert.equal(res.length, 1);
      assert.equal(res[0].name, 'list_series_result');

      done();
    });
  });

  it('should read the event OS01 from the database', function (done) {

    clientInflux.query('select temperature FROM OS01;', function (err, res) {
      logger.trace('-----------');
      logger.trace('query OS01');
      logger.trace('err', err);
      logger.trace('res=', res);

      assert.equal(err, null);
      assert(res instanceof Array);
      assert.equal(res.length, 1);
      assert.equal(res[0].name, 'OS01');
      assert.equal(res[0].points[0][2], 20);

      done();
    });
  });

  it('should read the event OS02 from the database', function (done) {

      clientInflux.query('SELECT temperature FROM OS02;', function (err, res) {

        logger.trace('-----------');
        logger.trace('query OS02');
        logger.trace('err=', err);
        logger.trace('res=', res);

      assert.equal(err, null);
      assert(res instanceof Array);
      assert.equal(res.length, 1);
      assert.equal(res[0].name, 'OS02');
      assert.equal(res[0].points[0][2], 14.5);

      done();
    });
  });

});

