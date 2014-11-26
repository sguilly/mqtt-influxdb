/**
 * Created by sguilly on 24/11/14.
 */

var bunyan = require('bunyan');

var mqtt = require('mqtt');
var influx = require('influx');

var _ = require('underscore');


console.log('Start');

var EventEmitter = require('events').EventEmitter,
  util = require('util');

function Consumer(opts) {
  if (!(this instanceof Consumer)) {
    return new Consumer(opts);
  }
  this.options = opts;
  this.transformKeys = Object.getOwnPropertyNames(this.options.decoder.transform);
  this.log = bunyan.createLogger(this.options.logger);


  EventEmitter.call(this);
}

util.inherits(Consumer, EventEmitter);

Consumer.prototype.open = function () {
  var that = this;

  var clientMqtt = mqtt.createClient(this.options.mqtt.port, this.options.mqtt.ip, {
    clean: false,
    encoding: 'utf8',
    clientId: this.options.mqtt.clientId
  });

  var clientInflux = influx(this.options.influx);

  //clientMqtt.subscribe('mqtt-zibase/#', {qos: this.options.mqtt.qos});
  clientMqtt.subscribe(this.options.mqtt.subscribe, {qos: this.options.mqtt.qos});

  clientMqtt.on('message', function (topic, message) {
    that.log.trace(topic);
    that.log.trace(message);

    var obj = JSON.parse(message);

    var point = {};

    var indexId = -1;
    var indexTime = -1;

    for (var propertyName in obj) {


      if(that.options.decoder.denyKeys.indexOf(propertyName) > -1)
      {
        continue;
      }

      if(indexId == -1)
      {
        indexId = that.options.decoder.idKeys.indexOf(propertyName);
        if(indexId > -1)
        {
          point['id'] = obj[propertyName];
          continue;
        }
      }

      if(indexTime == -1)
      {
        indexId = that.options.decoder.timeKeys.indexOf(propertyName);
        if(indexId >0)
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
        continue;
      }


      //else if(propertyName == 'alarm')
      //{
      //  point[propertyName] = 1;
      //}

    }

    if(indexTime == -1)
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
        that.log.trace('point to insert = \n',point);
        that.log.trace('insertion in fluxdb done');
      }
    });

  });
};

module.exports = Consumer;
