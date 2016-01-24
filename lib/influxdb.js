/**
 * Created by sguilly on 23/01/16.
 */
/**
 * Created by sguilly on 23/01/16.
 */

"use strict";

var influx = require('influx');

function clientInflux(opts) {
    var that = this;

    var clientInflux = influx(opts.influx);


}

module.exports = clientInflux;