var Context = require("./context.js");
var proxyContext = require("./proxycontext.js");
var net = require("net");

var agi = function (handler, optionsIn) {
    var server;
    var options = optionsIn || {};

    var settings = {
        port: options.port || 3000,
        debug: options.debug || false,
        logger: options.logger || false,
        host: options.host,
    };

    var handle = function (stream) {
        var context = new Context(stream, { debug: settings.debug, logger: options.logger });
        var proxy_context = proxyContext(context);
        handler(proxy_context);
    };

    var start = function (portIn, hostIn) {
        var port = portIn || settings.port;
        var host = hostIn || settings.host;
        return net.createServer(handle).listen(port, host);
    };

    return {
        start: start,
    };
};

module.exports = agi;
