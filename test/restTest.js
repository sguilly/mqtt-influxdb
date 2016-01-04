var request = require('request');

request({ url: 'http://localhost:5080/data', method: 'POST', qs: {foo: "bar", woo: "car"}, body: JSON.stringify({'toto':'tt'})}, function(error, response, body)
{
    if(error) {
        console.log(error);
    } else {
        console.log(response.statusCode, body);
    }
});