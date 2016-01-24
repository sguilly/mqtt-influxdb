/**
 * Created by sguilly on 23/01/16.
 */

var ClientMqtt = require('./mqtt');

function Etl(opts) {

    var that = this;

    require('./log')(opts, this);

    that.persistence = require('./persistence')(opts);

    that.clientMqtt = new ClientMqtt(opts, function (topic, message) {
        that.receive(topic, message);
    });


    //that.clientMqtt.on('message', function (topic, message) {
    //        that.receive(topic,message);
    //    });

    that.clientInflux = require('influx')(opts.influx);

    that.parse = require('./parse');

    that.open();

}

Etl.prototype.open = function () {
    var that = this;

    that.info('start');

    that.persistence.loadDecoders().then(function (values) {

        that.etl = values;

        that.patterns = [];

        var topicsToSubcribe = Object.keys(values);

        for (key in topicsToSubcribe) {

            that.activeTopic(topicsToSubcribe[key]);

        }
    })
};

Etl.prototype.receive = function (topic, message) {

    var that = this;

    console.log(topic, message);

    var newPoint = that.parse(topic, message);

    if (newPoint) {
        that.info('newPoint =' + JSON.stringify(newPoint));
        that.persistence.insert({
            seriesName: newPoint.seriesName,
            values: newPoint.values,
            tags: newPoint.tags
        }, function (err, newDoc) {   // Callback is optional
            that.trace('newDoc', newDoc);

            that.clientInflux.writePoint(newPoint.seriesName, newPoint.values, newPoint.tags, function (err) {
                if (err) {
                    that.error(err);
                }
                else {

                    that.persistence.remove(newDoc._id, function (err) {
                        if (err) {
                            that.error(err);
                        }
                        else {
                            that.trace('remove done');
                        }

                    });
                }
            });


        });
    }


};

Etl.prototype.activeTopic = function (topic) {
    var that = this;

    var tokens = topic.split('/');

    that.patterns.push({count: 0, topic: topic, tokens: tokens});

    that.clientMqtt.subscribeTopic(topic);
};


Etl.prototype.addDecoders = function (values) {
    var that = this;
    console.log('decoders=', values);


    that.persistence.saveDecoders(values).then(function () {

        console.log('save done');
    });
};

module.exports = Etl;