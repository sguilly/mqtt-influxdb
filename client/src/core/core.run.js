'use strict';

(function () {


    var core = angular.module('app.core');

    core.run(function(Restangular) {

        console.log('set Restangular');
        Restangular.setBaseUrl('http://localhost:5080');
        //Restangular.setFullResponse(true);

    });
})();
