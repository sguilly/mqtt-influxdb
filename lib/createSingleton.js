/**
 * Created by sguilly on 24/01/16.
 */
/**
 * Expose `createSingleton` function UMD style.
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.createSingleton = factory();
    }
}(this, function () {
    // The singleton pattern is a design pattern that is used to restrict
    // instantiation of a class to one object. This is useful when exactly
    // one object is needed to coordinate actions across the system.
    return function createSingleton(cb) {
        var args = Array.prototype.slice.call(arguments, 1);
        var name = '__' + (cb.name || Math.random());

        return function () {
            if (arguments.callee[name]) {
                return arguments.callee[name];
            }
            arguments.callee[name] = this;

            cb.apply(this, args.length ? args : arguments);
        };
    };
}));