/**
 * Created by sguilly on 24/11/14.
 */

var mqtt = require('mqtt');
var influx = require('influx');

var schedule = require('node-schedule');

var _ = require('underscore');

function Consumer(opts) {

    var that = this;

    if (!(that instanceof Consumer)) {
        return new Consumer(opts);
    }
    that.options = opts;

    if (opts.logger) {
        that.log = opts.logger;
    }
    else {
        that.log = require('./logger');
    }

    if (opts.persistence) {
        if (opts.persistence.type === 'nedb') {
            var Datastore = require('nedb');
            that.dataDb = new Datastore({filename: 'data.db', autoload: true, timestampData: true});
            that.decoderDb = new Datastore({filename: 'decoder.db', autoload: true, timestampData: true});
        }
    }

    that.data = [];

    that.log.trace('Application started');

    that.activeDecoder = function(topic)
    {
        that.clientMqtt.subscribe(topic, {qos: 0});

        var tokens = topic.split('/');

        that.patterns.push({count: 0, topic: topic, tokens: tokens});
    };

    that.loadDecoder = function () {
        var topicsToSubcribe = Object.keys(that.data);

        console.log('topicsToSubcribe=', topicsToSubcribe);

        that.patterns = [];


        for (var indexTopic = 0; indexTopic < topicsToSubcribe.length; indexTopic++) {

            //console.log('subscribe topic=', topicsToSubcribe[indexTopic], ' qos=', topicsToSubcribe[indexTopic].qos);

            that.activeDecoder(topicsToSubcribe[indexTopic]);

        }

    }

}

Consumer.prototype.addDecoder = function (decoder, callback) {
    var that = this;

    if (that.decoderDb) {
        that.decoderDb.update({topic: decoder.topic}, decoder, {upsert: true}, function (err, newDoc) {   // Callback is optional

            callback(err);

        });
    }
    else {
        that.data[decoder.topic] = decoder.params;
        callback();
    }
};

Consumer.prototype.open = function () {
    var that = this;


    if (that.options.rest && that.dataDb) {
        //----------------//
        var express = require('express');
        var app = express();
        var bodyParser = require('body-parser');

        var Data = require('./models/data')(that.dataDb);
        var Decoder = require('./models/decoder')(that);


        require('express-crud')(app);

        app.use(bodyParser.json()); // for parsing application/json
        app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

        app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
            next();
        });

        app.crud('data', Data);
        app.crud('decoder', Decoder);

        app.listen(5080);


        that.decoderDb.find({}, function (err, decoders) {

            for (var indexDecoder = 0; indexDecoder < decoders.length; indexDecoder++) {
                var decoder = decoders[indexDecoder];

                console.log('decoder=', decoder);

                that.data[decoder.topic] = decoder.params;
            }

        });

    }

    that.clientMqtt = mqtt.connect(
        {
            port: this.options.mqtt.port,
            host: this.options.mqtt.ip,
            clean: false,
            encoding: 'utf8',
            clientId: this.options.mqtt.clientId,
            protocolId: 'MQIsdp',
            protocolVersion: 4
        });

    var clientInflux = influx(this.options.influx);

    that.clientMqtt.on('connect', function () {
        that.loadDecoder();
    });

    that.clientMqtt.on('message', function (topic, message) {

        //console.log('-->',topic, message.toString());
        that.log.trace('receive message from ' + topic);

        var obj = JSON.parse(message.toString());

        that.log.trace(obj);

        var values = {};
        var tags = {};

        var indexId = -1;
        var indexTime = -1;

        var tokensTopic = topic.split('/');

        var indexPattern;
        var match;

        for (indexPattern = 0; indexPattern < that.patterns.length; indexPattern++) {

            match = true;

            var tokensPattern = that.patterns[indexPattern].tokens;

            //console.log('check pattern :', tokensPattern);

            for (var indexToken = 0; indexToken < tokensPattern.length; indexToken++) {

                //console.log(indexToken + ' :', tokensPattern[indexToken], '<>', tokensTopic[indexToken]);

                if (tokensPattern[indexToken] !== '#' && tokensPattern[indexToken] !== '+' && tokensTopic[indexToken] !== tokensPattern[indexToken]) {
                    match = false;
                    //console.log('not this pattern');
                    break;
                }
            }

            if (match) {
                break;
            }
        }

        if (match) {

            //console.log('match=', match, ' index=', indexPattern, ' topic=', that.patterns[indexPattern].topic);

            var decoder = that.data[that.patterns[indexPattern].topic];
            var seriesName;

            //console.log('decoder=', decoder);

            decoder.transformKeys = Object.getOwnPropertyNames(decoder.transform);

            //console.log('check typeof decoder.seriesName =',typeof decoder.seriesName);

            if (typeof decoder.seriesName === 'string') {

                seriesName = decoder.seriesName;
                //console.log('1/ define seriesName=',seriesName);
            }


            for (var propertyName in obj) {

                if (decoder.denyKeys.indexOf(propertyName) > -1) {
                    continue;
                }

                if (typeof seriesName === 'undefined' && typeof decoder.seriesName === 'object') {

                    //console.log('try to find seriesName :',propertyName, ' in',decoder.seriesName);
                    var indexSeriesName = decoder.seriesName.indexOf(propertyName);

                    if (indexSeriesName > -1) {
                        seriesName = decoder.seriesName[indexSeriesName];

                        //console.log('2/ define seriesName=',seriesName);
                        continue;
                    }

                }

                var indexTime = decoder.timeKeys.indexOf(propertyName);
                if (indexTime > -1) {
                    var dateObj = new Date(obj[propertyName]);
                    values['time'] = dateObj;
                    continue;
                }

                var value = obj[propertyName];

                var idTransform = decoder.transformKeys.indexOf(propertyName);


                if (idTransform > -1) {
                    propertyName = decoder.transform[decoder.transformKeys[idTransform]];
                }

                var indexTag = decoder.tagKeys.indexOf(propertyName);
                if (indexTag > -1) {
                    tags[propertyName] = value.toString();
                    continue;
                }


                if (decoder.allowString || _.isNumber(value)) {
                    values[propertyName] = value;
                }

            }

            if (typeof values['time'] === 'undefined') {
                values['time'] = new Date();
            }

            //console.log('');
            console.log('writePoint', seriesName, values, tags);

            console.log('');
            console.log('');

            if (that.dataDb) {
                that.dataDb.insert({seriesName: seriesName, values: values, tags: tags}, function (err, newDoc) {   // Callback is optional
                    //console.log('newDoc',newDoc);

                    //that.dataDb.remove({ _id: newDoc._id }, {}, function (err, numRemoved) {
                    //    //console.log('remove done');
                    //});

                });
            }


            //clientInflux.writePoint(values['id'], values, null, function (err) {
            //    if (err) {
            //        that.log.error(err);
            //    }
            //    else {
            //        that.log.trace('point to insert = ');
            //        that.log.trace(values);
            //        that.log.trace('insertion in fluxdb done');
            //    }
            //});
        }


    });
};

module.exports = Consumer;
