/**
 * Created by sguilly on 24/11/14.
 */
var shortid = require('shortid');

var mqtt = require('mqtt');
var influx = require('influx');

var Promise = require('es6-promise').Promise;

var Persistence = require("./persistence");

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


    //var Datastore = require('nedb');
    //
    //if (opts.persistence) {
    //    if (opts.persistence.storeInDisk === true) {
    //
    //        that.dataDb = new Datastore({filename: 'data.db', autoload: true, timestampData: true});
    //        that.dataDb.persistence.setAutocompactionInterval(30000);
    //
    //        that.etlDb = new Datastore({filename: 'etl.db', autoload: true, timestampData: true});
    //        that.etlDb.persistence.setAutocompactionInterval(30000);
    //    }
    //}
    //
    //if (!that.dataDb) {
    //    that.dataDb = new Datastore();
    //}
    //
    //if (!that.etlDb) {
    //    that.etlDb = new Datastore();
    //}


    that.etl = [];

    that.log.info('Application started');

    that.activeDecoder = function (topic) {

        that.log.trace('Subscribe to ' + topic);

        that.clientMqtt.subscribe(topic, {qos: 0});

        var tokens = topic.split('/');

        that.patterns.push({count: 0, topic: topic, tokens: tokens});
    };

    that.activeDecoders = function () {
        var topicsToSubcribe = Object.keys(that.etl);

        that.log.trace('topicsToSubcribe=' + topicsToSubcribe);

        that.patterns = [];


        for (var indexTopic = 0; indexTopic < topicsToSubcribe.length; indexTopic++) {

            //console.log('subscribe topic=', topicsToSubcribe[indexTopic], ' qos=', topicsToSubcribe[indexTopic].qos);

            that.activeDecoder(topicsToSubcribe[indexTopic]);

        }

    };

}

//Consumer.prototype.addDecoders = function (decoders) {
//    var that = this;
//
//    var promises = [];
//
//    function addDecoder(decoder) {
//        var promise = new Promise(function (resolve, reject) {
//            that.etlDb.update({topic: decoder.topic}, decoder, {upsert: true}, function (err) {   // Callback is optional
//
//                if (err) {
//                    reject(err);
//                }
//                else {
//                    resolve();
//                }
//
//            });
//        });
//
//        return promise;
//    }
//
//    if (Array.isArray(decoders)) {
//
//        for (var indexDecoder = 0; indexDecoder < decoders.length; indexDecoder++) {
//            var decoder = decoders[indexDecoder];
//
//            promises.push(addDecoder(decoder));
//        }
//
//    }
//    else {
//        promises.push(addDecoder(decoders));
//    }
//
//    return Promise.all(promises);
//
//};

Consumer.prototype.open = function () {
    var that = this;


    //if (that.dataDb) {
    //    //----------------//
    //
    //    that.etlDb.find({}, function (err, decoders) {
    //
    //        for (var indexDecoder = 0; indexDecoder < decoders.length; indexDecoder++) {
    //            var decoder = decoders[indexDecoder];
    //
    //            that.log.trace('decoder in db=' + JSON.stringify(decoder));
    //
    //            that.etl[decoder.topic] = decoder.params;
    //        }
    //
    //    });
    //
    //}

    Persistence.loadDecoders().then(function () {
        that.clientMqtt = mqtt.connect(
            {
                port: this.options.mqtt.port,
                host: this.options.mqtt.ip,
                clean: false,
                encoding: 'utf8',
                clientId: this.options.mqtt.clientId + '-' + shortid.generate(),
                protocolId: 'MQIsdp',
                protocolVersion: 4
            });

        var clientInflux = influx(this.options.influx);

        that.clientMqtt.on('connect', function () {
            that.activeDecoders();
        });

        that.clientMqtt.on('message', function (topic, message) {
            that.receive(topic, message);
        });

    });

    that.receive = function (topic, message) {

        function isDate(val) {
            var d = new Date(val);
            return !isNaN(d.valueOf());
        }

        //console.log('-->', topic, message.toString());
        that.log.trace('receive ' + message.toString() + ' from ' + topic);

        //console.log('is a number ?',isNaN(message.toString()))

        try {


            var obj = JSON.parse(message.toString());

            //console.log('message typeof=',typeof obj);

            //that.log.trace(JSON.stringify(obj));


            if (typeof obj !== 'object') {
                if (typeof obj === 'number') {
                    obj = {value: obj};
                }
                else {
                    obj = {string: obj};
                }



            }

            console.log('obj=', obj);

            var values = {};
            var tags = {};

            var tokensTopic = topic.split('/');

            var indexPattern;
            var match;

            for (indexPattern = 0; indexPattern < that.patterns.length; indexPattern++) {

                match = true;

                var tokensPattern = that.patterns[indexPattern].tokens;

                that.log.trace('check pattern :' + tokensPattern);

                for (var indexToken = 0; indexToken < tokensPattern.length; indexToken++) {

                    that.log.trace(indexToken + ' :' + tokensPattern[indexToken] + '<>' + tokensTopic[indexToken]);

                    if (tokensPattern[indexToken] !== '#' && tokensPattern[indexToken] !== '+' && tokensTopic[indexToken] !== tokensPattern[indexToken]) {
                        match = false;
                        that.log.trace('not this pattern');
                        break;
                    }
                }

                if (match) {
                    break;
                }
            }

            if (match) {

                //console.log('match=', match, ' index=', indexPattern, ' topic=', that.patterns[indexPattern].topic);

                var decoder = that.etl[that.patterns[indexPattern].topic];
                var seriesName;

                tags['topic'] = topic;

                //console.log('decoder=', decoder);

                if (decoder.transform) {
                    decoder.transformKeys = Object.getOwnPropertyNames(decoder.transform);
                }


                //console.log('check typeof decoder.seriesName =',typeof decoder.seriesName);

                if (typeof decoder.seriesName === 'string') {

                    seriesName = decoder.seriesName;
                    //console.log('1/ define seriesName=',seriesName);
                }


                for (var propertyName in obj) {

                    if (decoder.denyKeys && decoder.denyKeys.indexOf(propertyName) > -1) {
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

                    if (decoder.timeKeys) {
                        var indexTime = decoder.timeKeys.indexOf(propertyName);
                        if (indexTime > -1) {
                            var dateObj = new Date(obj[propertyName]);
                            values['time'] = dateObj;
                            continue;
                        }
                    }

                    var value = obj[propertyName];

                    if (decoder.transformKeys) {
                        var idTransform = decoder.transformKeys.indexOf(propertyName);


                        if (idTransform > -1) {
                            propertyName = decoder.transform[decoder.transformKeys[idTransform]];
                        }
                    }

                    if (decoder.tagKeys) {
                        var indexTag = decoder.tagKeys.indexOf(propertyName);
                        if (indexTag > -1) {
                            tags[propertyName] = value.toString();
                            continue;
                        }
                    }


                    if (decoder.allowString || typeof value === 'number') {
                        values[propertyName] = value;
                    }
                    else {
                        tags[propertyName] = value.toString();
                    }

                }

                if (typeof values['time'] === 'undefined') {
                    values['time'] = new Date();
                }

                if (Object.keys(values).length < 2) {

                    console.log('no value');
                    return;
                }


                that.log.info('newPoint =' + JSON.stringify(seriesName) + '|' + JSON.stringify(values) + '|' + JSON.stringify(tags));


                if (that.dataDb) {
                    that.dataDb.insert({seriesName: seriesName, values: values, tags: tags}, function (err, newDoc) {   // Callback is optional
                        that.log.trace('newDoc', newDoc);

                        clientInflux.writePoint(seriesName, values, tags, function (err) {
                            if (err) {
                                that.log.error(err);
                            }
                            else {

                                that.dataDb.remove({_id: newDoc._id}, {}, function (err) {
                                    if (err) {
                                        that.log.error(err);
                                    }
                                    else {
                                        that.log.trace('remove done');
                                    }

                                });
                            }
                        });


                    });
                }


            }

        } catch (err) {
            console.log('JSON.parse err=', err);
        }
    }
    );;


}
module.exports = Consumer;
