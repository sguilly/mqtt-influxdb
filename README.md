## Overview

MQTT is a machine-to-machine (M2M)/"Internet of Things" connectivity
protocol. It was designed as an extremely lightweight publish/subscribe
messaging transport. It is useful for connections with remote locations where
a small code footprint is required and/or network bandwidth is at a premium.

InfluxDB is a time-series metrics and events database based on the LevelDB key-value store.

mqtt-influxdb offer a simple way to store packets information with timestamp in an influxdb database.
 
### Getting started

## Installing

In node install with npm install git+https://github.com/sguilly/mqtt-influxdb.git

## Setup params

  
    var mqttInfluxdb = require('mqtt-influxdb');
    
    var opts = {
      logger: {...},
      mqtt: {...},
      influx :{...},
      decoder :{...}
    };
    
    var consumer = mqttInfluxdb(opts);
    
    consumer.open();
  
### logger
  
  * **name** - name fo the logger
  * **stream** - streams of buyan (see : https://github.com/trentm/node-bunyan)
  
  example :
  
    mqtt: {
        ip : '127.0.0.1',
        port: 3001, // tcp
        clientId : 'mqtt-influxdb',
        subscribe : ['mqtt-teleinfo/#','mqtt-zibase/#'],
        qos : 1 // 0 : without persistence and no ACK | 1 : with offline mode and ACK
      }
  
### mqtt

  * **ip** : adress of the mqtt broker
  * **port** : port of the mqtt broker
  * **clientId** : name of the mqtt client
  * **subscribe** : array of topics to subscribe
  * **qos** : define the quality of service (0 : without persistence and no ACK | 1 : with offline mode and ACK)
  
  example :
  
    mqtt: {
        ip : '127.0.0.1',
        port: 3001, // tcp
        clientId : 'mqtt-influxdb',
        subscribe : ['mqtt-teleinfo/#','mqtt-zibase/#'],
        qos : 1 // 0 : without persistence and no ACK | 1 : with offline mode and ACK
      }
      
### influxdb

  * **host** : adress of the influxdb server
  * **port** : port of the influxdb database (default 8086)
  * **username** : username with write permission
  * **password** : password
  * **database** : name of the database to store information

  example :

      influx :{
        host : '127.0.0.1',
        port : 8086, // optional, default 8086
        username : 'root',
        password : 'root',
        database : 'timeseries'
      }
      
### decoder

  * **idKeys** : array of keys to use as the name of the timeseries
  * **timeKeys** : array of keys to use as the timestamp (by default timestamp is now()
  * **denyKeys** : array of keys not to save in the timeserie
  * **transform** : object with pair of keys to transform the name of some labels before save it
  * **allowString** : allow to save string value


  example :
  
    decoder :{
      idKeys : ['id'],
      timeKeys : ['time','date'],
      denyKeys : ['power'],
      transform : {tem : 'temperature', hum : 'humidity'},
      allowString : false
    }




