/**
 * Created by sguilly on 24/11/14.
 */

var bunyan = require('bunyan')
    , bformat = require('bunyan-format')
    , formatOut = bformat({outputMode: 'short'});

var logger = bunyan.createLogger({name: 'mqttInfluxdb', level: 'info', stream: formatOut});

var mqttInfluxdb = require('../lib/mqtt-influxdb');

var opts = {
    logger: logger,
    persistence: {storeInDisk: true},
    mqtt: {
        ip: 'xxx.ovh.net',
        port: 1883, // tcp
        clientId: 'mqttInfluxdb_' + Math.random().toString(16).substr(2, 8),
        clean: false
    },
    influx: {
        host: 'xxx.ovh.net',
        port: 8086, // optional, default 8086
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
            tagKeys: ['hostname', 'name'],
            transform: {tem: 'temperature', hum: 'humidity'},
            allowString: false
        }
    }]).then(function ()
{
    consumer.open();
});


var express = require('express');
var app = express();

var mqttInfluxdbUi = require('/media/sguilly/storage/SRC/GITHUB/mqtt-influxdb-ui/index.js');

app.use('/mqtt-influxdb-ui', mqttInfluxdbUi(consumer));

app.listen(5080);