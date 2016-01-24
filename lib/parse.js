/**
 * Created by sguilly on 23/01/16.
 */

function parse(topic, message) {
    var that = this;

    function isDate(val) {
        var d = new Date(val);
        return !isNaN(d.valueOf());
    }

    that.trace('receive ' + message.toString() + ' from ' + topic);

    try {
        var obj = JSON.parse(message.toString());
    } catch (err) {
        that.error('JSON.parse err=', err);
        return;
    }


    if (typeof obj !== 'object') {
        if (typeof obj === 'number') {
            obj = {value: obj};
        }
        else {
            obj = {string: obj};
        }


    }

    that.trace('obj=', obj);

    var values = {};
    var tags = {};

    var tokensTopic = topic.split('/');

    var indexPattern;
    var match;

    for (indexPattern = 0; indexPattern < that.patterns.length; indexPattern++) {

        match = true;

        var tokensPattern = that.patterns[indexPattern].tokens;

        that.trace('check pattern :' + tokensPattern);

        for (var indexToken = 0; indexToken < tokensPattern.length; indexToken++) {

            that.trace(indexToken + ' :' + tokensPattern[indexToken] + '<>' + tokensTopic[indexToken]);

            if (tokensPattern[indexToken] !== '#' && tokensPattern[indexToken] !== '+' && tokensTopic[indexToken] !== tokensPattern[indexToken]) {
                match = false;
                that.trace('not this pattern');
                break;
            }
        }

        if (match) {
            that.trace('know this pattern');
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

            that.trace('no value');
            return;
        }

        return {seriesName: seriesName, values: values, tags: tags};


    }


}

module.exports = parse;