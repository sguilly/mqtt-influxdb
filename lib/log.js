/**
 * Created by sguilly on 24/01/16.
 */
function log(opts, obj) {

    var Type = require('type-of-is');

    if (opts && opts.logger) {

        if (Type.is(opts.logger, Object) == true) {
            obj.trace = opts.logger.trace;
            obj.debug = opts.logger.debug;
            obj.info = opts.logger.info;
            obj.warm = opts.logger.warm;
            obj.error = opts.logger.error;
            obj.fatal = opts.logger.fatal;
        }
        else(Type.is(opts.logger, JSON) == true );
        {
            var logger = require('/media/sguilly/storage/SRC/BITBUCKET/ido4pro-control-process/lib/index.js');

            logger.create({
                name: 'loggerForTest-' + Math.random().toString(16).substr(2, 8),
                level: 'trace',
                console: true,
                path: __dirname,
                //child: 'toto',
                osMetrics: 120000,
                processMetrics: 30000,
                host: 'localhost'
            });
        }


    }
    else {
        obj.trace = console.log;
        obj.debug = console.log;
        obj.info = console.log;
        obj.warm = console.log;
        obj.error = console.log;
        obj.fatal = console.log;
    }
}

module.exports = log;