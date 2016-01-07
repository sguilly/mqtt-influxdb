/**
 * Created by sguilly on 24/11/14.
 */

var redis = require('redis');

if (process.env.DOCKER === 'true') {
    console.log('env=', process.env);

    var influxHost = process.env.INFLUXDB_PORT_8086_TCP_ADDR;
    var influxPort = process.env.INFLUXDB_PORT_8086_TCP_PORT;

    console.log('InfluxDb from docker =' + influxHost + ' ' + influxPort);

    var redisHost = process.env.REDIS_PORT_6379_TCP_ADDR;
    var redisPort = process.env.REDIS_PORT_6379_TCP_PORT;
    console.log('Redis from docker =' + redisHost + ' ' + redisPort);

    var clientRedis = redis.createClient(redisPort, redisHost);
}
else {

    console.log('local redis');
    var influxHost = 'localhost';
    var influxPort = 8086;

    var redisHost = 'localhost';
    var redisPort = 6379;
}


var logger = require('/media/sguilly/storage/SRC/BITBUCKET/ido4pro-control-process/lib/index.js');

var remoteControlCb = function (action) {
    console.log('action=', action.toString());
};

logger.create({
    name: 'loggerForTest-' + Math.random().toString(16).substr(2, 8),
    level: 'info',
    console: true,
    path: __dirname,
    //child: 'toto',
    osMetrics: 120000,
    processMetrics: 30000,
    host: 'localhost',

    remoteControlCb: remoteControlCb
});

var mqttInfluxdb = require('../lib/mqtt-influxdb');

var opts = {
    logger: logger,
    persistence: {storeInDisk: true},
    mqtt: {

        ip: 'localhost',
        port: 1883, // tcp
        clientId: 'mqttInfluxdb_' + Math.random().toString(16).substr(2, 8),
        clean: false
    },
    influx: {
        host: influxHost,
        port: influxPort, // optional, default 8086
        username: 'root',
        password: 'root',
        database: 'timeseries'
    }
};

var consumer = mqttInfluxdb(opts);

consumer.addDecoders([{
    topic: '+/process',
    params: {
        qos: 0,
        seriesName: 'process',
        timeKeys: ['time', 'date'],
        denyKeys: [],//['power'],
        tagKeys: ['hostname', 'pid', 'name'],
        transform: {tem: 'temperature', hum: 'humidity'},
        allowString: false
    }
},
    {
        topic: '+/os',
        params: {
            qos: 0,
            seriesName: 'os',
            timeKeys: ['time', 'date'],
            denyKeys: [],//['power'],
            //tagKeys: ['hostname', 'name'],
            transform: {tem: 'temperature', hum: 'humidity'},
            allowString: false
        }
    },

    {
        topic: '$SYS/#',
        params: {
            qos: 0,
            seriesName: 'mosca',
            timeKeys: ['time', 'date'],
            denyKeys: [],//['power'],
            //tagKeys: ['hostname', 'name'],
            transform: {tem: 'temperature', hum: 'humidity'},
            allowString: false
        }
    }

]).then(function ()
{
    consumer.open();
});


var express = require('express');
var app = express();

//var mqttInfluxdbUi = require('/media/sguilly/storage/SRC/GITHUB/mqtt-influxdb-ui/index.js');

var mqttInfluxdbUi = require('mqtt-influxdb-ui');


app.use('/mqtt-influxdb-ui', mqttInfluxdbUi(consumer, clientRedis));

app.listen(5080, '0.0.0.0');