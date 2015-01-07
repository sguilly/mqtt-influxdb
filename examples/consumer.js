/**
 * Created by sguilly on 24/11/14.
 */

var bunyan = require('bunyan');
var logger = bunyan.createLogger({name: "myapp"});

var mqttInfluxdb = require('../lib/mqtt-influxdb');


var opts = {
  logger: logger,
  mqtt: {
    ip : '127.0.0.1',
    port: 1883, // tcp
    clientId : 'mqtt-influxdb',
    subscribe: ['windguru'],
    qos : 1 // 0 : without persistence and no ACK | 1 : with offline mode and ACK
  },
  influx :{
    host : '127.0.0.1',
    port : 8086, // optional, default 8086
    username : 'root',
    password : 'root',
    database : 'timeseries'
  },
  decoder :{
    idKeys : ['id'],
    timeKeys : ['time','date'],
    denyKeys : ['power'],
    transform : {tem : 'temperature', hum : 'humidity'},
    allowString : false
  }
};

var consumer = mqttInfluxdb(opts);

consumer.open();
