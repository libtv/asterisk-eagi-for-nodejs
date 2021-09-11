const util = require("util");
const EventEmitter = require("events").EventEmitter;
const state = require("./state.js");
const commands = require("./command.js");

const success = "200 result=0 AUDIOFORK SUCCESS \n";

const Context = function (stream, loggerOptions = {}) {
    EventEmitter.call(this);

    function consoleDecorator(arrow, data) {
        return console.log(arrow, JSON.stringify(data));
    }
    this.log = loggerOptions.logger ? loggerOptions.logger : consoleDecorator;

    this.debug = loggerOptions.debug;
    this.stream = stream;
    this.state = state.init;
    this.successCallback = null;

    this.msg = "";
    this.variables = {};
    this.pending = null;

    var self = this;
    this.stream.on("readable", function () {
        self.read();
    });

    this.stream.on("error", this.emit.bind(this, "error"));
    this.stream.on("close", this.emit.bind(this, "close"));
};

util.inherits(Context, EventEmitter);

Context.prototype.read = function () {
    var buffer = this.stream.read();
    if (this.state === state.reading) {
        if (buffer != null && buffer.includes(success)) {
            var parsed = /^(\d{3})(?: result=)([^(]*)(?:\((.*)\))?/.exec(success);
            var result = this.lineSplit(parsed);
            buffer = null;
            this.msg = "";
            return this.successCallback(null, result);
        } else if (buffer != null && buffer.includes("result")) {
            buffer = null;
            this.msg = "";
            return;
        } else if (buffer != null) {
            this.pending(Buffer.from(buffer, "latin1"));
            buffer = null;
            this.msg = "";
            return;
        }
    }
    if (!buffer) return this.msg;

    this.msg += buffer;

    if (this.state === state.init) {
        if (this.msg.indexOf("\n\n") < 0) return this.msg; //we don't have whole message
        this.readVariables(this.msg);
    } else if (this.state === state.waiting) {
        if (this.msg.indexOf("\n") < 0) return this.msg; //we don't have whole message
        this.readResponse(this.msg);
    }

    return "";
};

Context.prototype.readVariables = function (msg) {
    this.msg = "";
    var lines = msg.split("\n");

    lines.map(function (line) {
        var split = line.split(":");
        var name = split[0];
        var value = split[1];
        this.variables[name] = (value || "").trim();
    }, this);

    this.emit("variables", this.variables);
    this.setState(state.waiting);
};

Context.prototype.readResponse = function (msg) {
    this.msg = "";
    var lines = msg.split("\n");

    lines.map(function (line) {
        this.readResponseLine(line);
    }, this);
};

Context.prototype.lineSplit = function (parsed_line) {
    var response = {
        code: parseInt(parsed_line[1]),
        result: parsed_line[2].trim(),
    };
    if (parsed_line[3]) {
        response.value = parsed_line[3];
    }

    return response;
};

Context.prototype.readResponseLine = function (line) {
    if (!line) return;

    var parsed = /^(\d{3})(?: result=)([^(]*)(?:\((.*)\))?/.exec(line);

    if (!parsed) {
        return this.emit("hangup");
    }

    var self = this;
    var response = self.lineSplit(parsed);

    //our last command had a pending callback
    if (this.pending) {
        var pending = this.pending;
        this.pending = null;
        pending(null, response);
    }
    this.emit("response", response);
};

Context.prototype.setState = function (state) {
    this.state = state;
};

Context.prototype.send = function (msg, cb) {
    this.pending = cb;
    this.stream.write(msg);
};

Context.prototype.end = async function () {
    this.stream.write("ENDSERVICE\n");
    this.stream.end();
    var self = this;
    var parsed = /^(\d{3})(?: result=)([^(]*)(?:\((.*)\))?/.exec(success);
    var response = self.lineSplit(parsed);
    return Promise.resolve(response);
};

Context.prototype.sendCommand = function (command) {
    if (this.debug) this.log("------->", { command: command });
    var self = this;
    return new Promise(function (resolve, reject) {
        self.send(command + "\n", function (err, result) {
            if (self.debug) self.log("<-------", { err: err, result: result });
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

Context.prototype.onEvent = function (event) {
    var self = this;
    return new Promise(function (resolve) {
        self.on(event, function (data) {
            resolve(data);
        });
    });
};

//additional agi commands

commands.forEach(function (command) {
    var str = "";
    Context.prototype[command.name] = function () {
        if (command.params > 0) {
            var args = [].slice.call(arguments, 0, command.params);
            str = command.command + " " + prepareArgs(args, command.paramRules, command.params).join(" ");
        } else {
            str = command.command;
        }
        return this.sendCommand(str);
    };
});

var prepareArgs = function (args, argsRules, count) {
    if (!argsRules || !count) {
        return args;
    }

    return Array.apply(null, new Array(count)) // old node.js versions don't support Array.fill()
        .map(function (arg, i) {
            arg = args[i] !== undefined && args[i] !== null ? args[i] : (argsRules[i] && argsRules[i].default) || "";
            var prepare =
                (argsRules[i] && argsRules[i].prepare) ||
                function (x) {
                    return x;
                };
            return prepare(String(arg));
        });
};

//sugar commands

Context.prototype.dial = function (target, timeout, params) {
    return this.exec("Dial", target + "," + timeout + "," + params);
};

module.exports = Context;
