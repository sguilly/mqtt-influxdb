/**
 * Created by sguilly on 23/01/16.
 */

var Promise = require('es6-promise').Promise;

function Persistence(opts) {

    var that = this;

    that.log = opts.logger ? opts.logger : require('./logger');

    log.trace('load Persistence');

    var Datastore = require('nedb');

    var dataDb, etlDb = {};

    if (opts.persistence) {
        if (opts.persistence.storeInDisk === true) {

            dataDb = new Datastore({filename: 'data.db', timestampData: true});
            dataDb.persistence.setAutocompactionInterval(30000);

            dataDb.loadDatabase(function (err) {    // Callback is optional
                if (err) {
                    log.error('Persistence loadDataBase err' + JSON.stringify(err));
                }
                else {
                    log.info('dataDb loaded!');
                }
            });

            etlDb = new Datastore({filename: 'etl.db', timestampData: true});
            etlDb.persistence.setAutocompactionInterval(30000);

            etlDb.loadDatabase(function (err) {    // Callback is optional
                if (err) {
                    log.error('Persistence loadDataBase err' + JSON.stringify(err));
                }
                else {
                    log.info('etlDb loaded!');
                }
            });
        }
    }

    if (!dataDb) {
        dataDb = new Datastore();
    }

    if (!etlDb) {
        etlDb = new Datastore();
    }

    that.saveDecoder = function (decoder) {
        var promise = new Promise(function (resolve, reject) {
            etlDb.update({topic: decoder.topic}, decoder, {upsert: true}, function (err) {

                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }

            });
        });

        return promise;
    };


    that.saveDecoders = function (decoders) {

        var promises = [];

        if (Array.isArray(decoders)) {

            for (var indexDecoder = 0; indexDecoder < decoders.length; indexDecoder++) {
                var decoder = decoders[indexDecoder];

                promises.push(that.saveDecoder(decoder));
            }

        }
        else {
            promises.push(that.saveDecoder(decoders));
        }

        return Promise.all(promises);

    };

    that.loadDecoders = function () {

        var promise = new Promise(function (resolve, reject) {

            var etl = [];

            if (etlDb) {

                etlDb.find({}, function (err, decoders) {

                    for (var indexDecoder = 0; indexDecoder < decoders.length; indexDecoder++) {
                        var decoder = decoders[indexDecoder];

                        log.trace('decoder in db=' + JSON.stringify(decoder));

                        if (decoder.topic && decoder.params) {
                            etl[decoder.topic] = decoder.params;
                        }
                        else {
                            log.trace('Persistence loadDecoders : bad line format');
                        }
                    }

                    resolve(etl);

                });

            }
            else {
                reject('no etlDb');
            }
        });

        return promise;
    };

    that.insert = function (value, callback) {

        dataDb.insert(value, callback);

    };

    that.remove = function (id, callback) {

        dataDb.remove({_id: id}, {}, callback);

    };

    return that;

}
module.exports = Persistence;