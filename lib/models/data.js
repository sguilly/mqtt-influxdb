
module.exports = function (db) {
    var module = {
        create: function (query, model, cb) {

            if(typeof model !== 'undefined' && model.topic && model.params)
            {
                db.insert(model, function (err, newDoc) {   // Callback is optional

                    cb(null, newDoc);

                });

                that.data[model.topic] = model.params;
            }
            else
            {
                cb("error", null); //first argument is response status, second is array of response data
            }


        },
        delete: function (id, query, cb) {

            db.remove({ _id: id }, {}, function (err, numRemoved) {
                cb(null, [numRemoved]);
            });


        },
        read: function (query, cb) {

            console.log('query=',query);

            if(typeof query['count'] !== 'undefined' )
            {
                db.count({}, function (err, count) {

                    console.log(count);
                    cb(null, [count]);
                });
            }
            else {
                db.find({}, function (err, docs) {
                    cb(null, docs);
                });
            }
        },
        readById: function (id, query, cb) {

            db.find({ _id: id }, function (err, docs) {
                cb(null, docs);
            });

        },
        update: function (id, query, model, cb) {

            db.update({ _id: id }, model, {}, function (err, numReplaced) {
                cb(null, numReplaced);
            });
        }
    };

    return module;
};