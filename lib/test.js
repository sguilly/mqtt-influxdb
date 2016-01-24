/**
 * Created by sguilly on 24/01/16.
 */

var ClientMqtt = require('./mqtt');

var opts = {
    name: 'mqttToInfluxdb',
    logger: null,
    persistence: {storeInDisk: true},
    mqtt: {

        ip: 'mqtt.ido4pro.com',
        port: 1883, // tcp
        clientId: 'mqttInfluxdb_' + Math.random().toString(16).substr(2, 8),
        clean: false
    },
    //influx: {
    //    host: influxHost,
    //    port: influxPort, // optional, default 8086
    //    username: 'root',
    //    password: 'root',
    //    database: 'timeseries'
    //}
};


var clientMqtt1 = new ClientMqtt(opts);


var clientMqtt2 = new ClientMqtt(opts);
//clientMqtt.open();