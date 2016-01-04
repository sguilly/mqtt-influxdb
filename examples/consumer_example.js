/**
 * Created by sguilly on 24/11/14.
 */

var bunyan = require('bunyan');
var logger = bunyan.createLogger({name: 'myapp',level: 'trace'});

var mqttInfluxdb = require('../lib/mqtt-influxdb');


var opts = {
  logger: logger,
  mqtt: {
    ip : 'xxxx.ovh.net',
    port: 1883, // tcp
    clientId : 'mqtt-influxdb',
    subscribe: ['topic1/subtopic','topic2/#'],
    qos : 1, // 0 : without persistence and no ACK | 1 : with offline mode and ACK
    clean: false
  },
  influx :{
    host : 'xxxxx.ovh.net',
    port : 8086, // optional, default 8086
    username : 'xxxx',
    password : 'xxxx',
    database : 'your timeseries'
  },
  decoder :{
    idKeys : ['id'],
    timeKeys : ['time','date'],
    denyKeys : [],//['power'],
    transform : {tem : 'temperature', hum : 'humidity'},
    allowString : false
  }
};

var consumer = mqttInfluxdb(opts);

consumer.open();
