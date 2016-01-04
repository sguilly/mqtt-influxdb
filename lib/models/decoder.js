
module.exports = function (app) {
    var module = {
        create: function (query, model, cb) {

            if(typeof model !== 'undefined' && Object.keys(model).length > 0)
            {
                app.decoderDb.insert(model, function (err, newDoc) {   // Callback is optional

                    cb(null, newDoc);

                });

                app.data[model.topic] = model.params;
                app.activeDecoder(model.topic);
            }
            else
            {
                cb("error", null); //first argument is response status, second is array of response data
            }


        },
        delete: function (id, query, cb) {

            app.decoderDb.remove({ _id: id }, {}, function (err, numRemoved) {
                cb(null, [numRemoved]);
            });


        },
        read: function (query, cb) {

            console.log('query=',query);

            if(typeof query['count'] !== 'undefined' )
            {
                app.decoderDb.count({}, function (err, count) {

                    console.log(count);
                    cb(null, [count]);
                });
            }
            else {
                app.decoderDb.find({}, function (err, docs) {
                    cb(null, docs);
                });
            }
        },
        readById: function (id, query, cb) {

            app.decoderDb.find({ _id: id }, function (err, docs) {
                cb(null, docs);
            });

        },
        update: function (id, query, model, cb) {

            console.log('update:',id,query,model);

            app.decoderDb.update({ _id: id }, model, {}, function (err, numReplaced) {
                cb(null, model);
            });
        }
    };

    return module;
};
