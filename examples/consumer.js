/**
 * Created by sguilly on 24/11/14.
 */

var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

var mqttInfluxdb = require('../lib/mqtt-influxdb');


var opts = {
  logger: {
    name: 'mqtt-influxdb-example',
    streams: [{
      level: 'trace',
      type: 'raw',
      stream: prettyStdOut
    }]
  },
  mqtt: {
    ip : '127.0.0.1',
    port: 3001, // tcp
    topic: 'mqtt-zibase/#',
    clientId : 'mqtt-influxdb',
    subscribe : ['mqtt-teleinfo/#','mqtt-zibase/#'],
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
