/**
 * Created by sguilly on 03/12/14.
 */
/*jshint expr: true, unused: false*/
/*global describe, it, before, after, not */

var assert = require('assert');

var mqttInfluxdb = require('../lib/mqtt-influxdb');

var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var mosca = require('mosca');

var influx = require('influx');

var ascoltatore = {
  //using ascoltatore
  type: 'memory'
};

var settings = {
  port: 1883,
  backend: ascoltatore
};

var opts = {
  logger: {
    name: 'mqtt-influxdb',
    streams: [
      {
        level: 'trace',
        type: 'raw',
        stream: prettyStdOut
      }]
  },
  mqtt: {
    ip: 'localhost',
    port: 1883, // tcp
    topic: 'mqtt-zibase/#',
    clientId: 'mqtt-influxdb',
    subscribe: ['mqtt-teleinfo/#', 'mqtt-zibase/#'],
    qos: 1 // 0 : without persistence and no ACK | 1 : with offline mode and ACK
  },
  influx: {
    host: 'localhost',
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
var clientInflux; // To create temp database, check points and delete temp database

describe('#start mqtt server', function () {
  it('should receive ready', function (done) {


    serverMqtt = new mosca.Server(settings);

    serverMqtt.on('clientConnected', function (client) {
      console.log('client connected', client.id);
    });

// fired when a message is received
    serverMqtt.on('published', function (packet) {
      console.log('Published', packet.payload);
    });

    serverMqtt.on('ready', function () {
      done();
    });
  });
});

describe('#start influxdb client', function () {
  it('should create a temp database', function (done) {

    clientInflux = influx(opts.influx);

    clientInflux.deleteDatabase(opts.influx.database, function (err) {
      console.log(err);
    });

    clientInflux.createDatabase(opts.influx.database, done);
  });
});


describe('#start mqtt-influxdb bridge and generate an event', function () {

  before(function (done) {
    var mqtt = require('mqtt');

    clientMqtt = mqtt.createClient(1883, 'localhost', {
      clean: false,
      encoding: 'utf8',
      clientId: 'testMqtt'
    });

    clientMqtt.on('connect', done);

    var consumer = mqttInfluxdb(opts);

    consumer.open();
  });


  it('should store an event', function (done) {

    clientMqtt.publish('mqtt-zibase/1', JSON.stringify({id: 'OS01', itemToDeny: true, tem: 20}));

    clientMqtt.publish('mqtt-zibase/1', JSON.stringify({id: 'OS02', time: new Date(), tem: 14.5}));

    setTimeout(function () {
        console.log('need to check');
        done();

      }, 250);

  });

});

describe('#query influxdb', function () {
  it('should read the event OS01 from the database', function (done) {
    clientInflux.query('SELECT temperature FROM OS01;', function (err, res) {
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
      assert.equal(err, null);
      assert(res instanceof Array);
      assert.equal(res.length, 1);
      assert.equal(res[0].name, 'OS02');
      assert.equal(res[0].points[0][2], 14.5);

      done();
    });
  });

});

describe('#delete influxdb database', function () {
  it('should delete the temp database', function (done) {

    clientInflux = influx(opts.influx);

    clientInflux.deleteDatabase(opts.influx.database, done);
  });
});

describe('#delete influxdb database and emit an new event', function () {

  before(function (done) {
    clientMqtt.publish('mqtt-zibase/1', JSON.stringify({id: 'OS03', time: new Date(), tem: 14.5}));

    setTimeout(function () {done();}, 250);

  });

  it('should raise an error', function (done) {
    clientInflux.query('SELECT temperature FROM OS03;', function (err) {
      assert(err instanceof Error);

      done();
    });
  });

});





