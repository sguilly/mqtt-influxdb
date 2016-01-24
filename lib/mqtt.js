/**
 * Created by sguilly on 23/01/16.
 */

"use strict";

var createSingleton = require('./createSingleton');

var shortid = require('shortid');
var mqtt = require('mqtt');

function clientMqtt(opts, callBackReceive) {
    var mqttParams = opts.mqtt ? opts.mqtt : {};
    //
    var mqttState = 0;

    var that = this;
    require('./log')(opts, this);

    var client = mqtt.connect(
        {
            port: mqttParams.port ? mqttParams.port : 1883,
            host: mqttParams.ip ? mqttParams.ip : 'localhost',
            clean: false,
            encoding: 'utf8',
            clientId: ( opts.name ? opts.name : 'mqttToInfluxDb') + '-' + shortid.generate(),
            protocolId: 'MQIsdp',
            protocolVersion: 4
        });

    //var client = mqtt.connect(
    //    {
    //        //port: mqttParams.port ? mqttParams.port : 1883,
    //        //host: mqttParams.ip ? mqttParams.ip : 'localhost1',
    //
    //        port: 1883,
    //        host: 'mqtt.ido4pro.com',
    //
    //
    //        clean: false,
    //        encoding: 'utf8',
    //        //clientId: ( opts.name ? opts.name : 'mqttToInfluxDb') + '-'+shortid.generate(),
    //        clientId: 'mqttToInfluxDb' + '-'+shortid.generate(),
    //        protocolId: 'MQIsdp',
    //        protocolVersion: 4
    //    });

    client.on('connect', function () {

        that.info('connect');
    });

    client.on('reconnect', function () {

        that.info('reconnect');
    });

    client.on('close', function () {

        that.info('close');
    });

    client.on('offline', function () {

        that.info('offline');
    });

    client.on('error', function () {

        that.error('error');
    });

    client.on('message', callBackReceive);

    this.subscribeTopic = function (topic) {
        this.trace('active topic=', topic);

        client.subscribe(topic, {qos: 0});
    };


}

module.exports = createSingleton(clientMqtt);