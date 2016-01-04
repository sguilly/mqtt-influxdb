/**
 * Created by sguilly on 24/11/14.
 */

var bunyan = require('bunyan');
var logger = bunyan.createLogger({name: 'myapp', level: 'trace'});

var mqttInfluxdb = require('../lib/mqtt-influxdb');

var opts = {
    logger: logger,
    persistence: {type: 'nedb'},
    rest: {port: 5080},
    mqtt: {
        ip: 'vps195103.ovh.net',
        port: 1883, // tcp
        clientId: 'mqttToInfluxdb_' + Math.random().toString(16).substr(2, 8),
        clean: false
    },
    influx: {
        host: 'vps195103.ovh.net',
        port: 8086, // optional, default 8086
        username: 'root',
        password: 'root',
        database: 'timeseries'
    },
    //decoder: {
    //    '+/process': {
    //        qos: 0,
    //        seriesName: 'process',
    //        timeKeys: ['time', 'date'],
    //        denyKeys: [],//['power'],
    //        tagKeys: ['hostname', 'pid', 'name'],
    //        transform: {tem: 'temperature', hum: 'humidity'},
    //        allowString: false
    //    }
    //}
};

var consumer = mqttInfluxdb(opts);

consumer.addDecoder({
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
},function(err)
{
    if(err)
    {
        console.log('err=',err);
    }
    else
    {
        consumer.open();
    }
});