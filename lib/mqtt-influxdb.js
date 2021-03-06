/**
 * Created by sguilly on 24/11/14.
 */

var mqtt = require('mqtt');
var influx = require('influx');

var _ = require('underscore');

function Consumer(opts) {
  if (!(this instanceof Consumer)) {
    return new Consumer(opts);
  }
  this.options = opts;
  this.transformKeys = Object.getOwnPropertyNames(this.options.decoder.transform);

  if (opts.logger) {
    this.log = opts.logger;
  }
  else {
    this.log = require('./logger');
  }

  this.log.trace('Application started');

}

Consumer.prototype.open = function () {
  var that = this;

  var clientMqtt = mqtt.createClient(this.options.mqtt.port, this.options.mqtt.ip, {
    clean: false,
    encoding: 'utf8',
    clientId: this.options.mqtt.clientId,
    protocolId: 'MQIsdp',
    protocolVersion: 3
  });

  var clientInflux = influx(this.options.influx);

  //clientMqtt.subscribe('mqtt-zibase/#', {qos: this.options.mqtt.qos});
  clientMqtt.subscribe(this.options.mqtt.subscribe, {qos: this.options.mqtt.qos});

  clientMqtt.on('message', function (topic, message) {
    that.log.trace(topic);


    var obj = JSON.parse(message.toString());

    that.log.trace(obj);

    var point = {};

    var indexId = -1;
    var indexTime = -1;

    for (var propertyName in obj) {

      if(that.options.decoder.denyKeys.indexOf(propertyName) > -1)
      {
        continue;
      }

      if(indexId === -1)
      {
        indexId = that.options.decoder.idKeys.indexOf(propertyName);
        if(indexId > -1)
        {
          point['id'] = obj[propertyName];
          continue;
        }
      }

      if(indexTime === -1)
      {
        indexTime = that.options.decoder.timeKeys.indexOf(propertyName);
        if(indexTime > -1)
        {
          var dateObj = new Date(obj[propertyName]);
          point['time'] = dateObj;
          continue;
        }
      }

      var value = obj[propertyName];

      var idTransform = that.transformKeys.indexOf(propertyName);

      if(idTransform > -1)
      {
        propertyName = that.options.decoder.transform[that.transformKeys[idTransform]];
      }

      if(that.options.decoder.allowString || _.isNumber(value) )
      {
        point[propertyName] = value;

      }

    }

    if(indexTime === -1)
    {
      point['time'] = new Date();
    }



    clientInflux.writePoint(point['id'],point, function(err)
    {
      if(err)
      {
        that.log.error(err);
      }
      else
      {
        that.log.trace('point to insert = ');
        that.log.trace(point);
        that.log.trace('insertion in fluxdb done');
      }
    });

  });
};

module.exports = Consumer;
