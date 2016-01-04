
module.exports = function (app) {
    var module = {
        create: function (query, model, cb) {

            if(typeof model !== 'undefined' && Object.keys(model).length > 0)
            {
                app.etlDb.insert(model, function (err, newDoc) {   // Callback is optional

                    app.etl[model.topic] = model.params;
                    app.activeDecoder(model.topic);

                    cb(null, newDoc);

                });


            }
            else
            {
                cb("error", null); //first argument is response status, second is array of response data
            }


        },
        delete: function (id, query, cb) {

            app.etlDb.remove({_id: id}, {}, function (err, numRemoved) {
                cb(null, [numRemoved]);
            });


        },
        read: function (query, cb) {

            console.log('query=',query);

            if(typeof query['count'] !== 'undefined' )
            {
                app.etlDb.count({}, function (err, count) {

                    console.log(count);
                    cb(null, [count]);
                });
            }
            else {
                app.etlDb.find({}, function (err, docs) {
                    cb(null, docs);
                });
            }
        },
        readById: function (id, query, cb) {

            console.log('read:', id, query);
            app.etlDb.find({_id: id}, function (err, docs) {

                console.log('docs:', docs);
                cb(null, docs[0]);
            });

        },
        update: function (id, query, model, cb) {

            console.log('update:',id,query,model);

            app.etlDb.update({_id: id}, model, {}, function (err) {

                if (err) {
                    cb(err, null);
                }
                else {
                    app.etl[model.topic] = model.params;
                    app.activeDecoder(model.topic);

                    cb(null, model);
                }

            });
        }
    };

    return module;
};
