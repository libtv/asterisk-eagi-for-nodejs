import { Readable } from "stream";
import { EventEmitter } from "events";
import { state } from "./state.js";
import fs from "fs";
import { commands } from "./command.js";

class Context_Reader extends Readable {
    constructor(stream) {
        super();
        this.setEncoding("utf8");
        this.stream = stream;
        this.msg = "";
        this.state = state.init;
        this.variables = {};
        this.callback = null;
        this.stream.on("readable", () => {
            this._read();
        });
    }

    _read() {
        let buffer = this.stream.read();

        if (!buffer) return;
        this.msg += buffer.toString();

        /* 처음 상태이면 */
        if (this.state === state.init) {
            if (this.msg.indexOf("\n\n") < 0) return;
            this.readVariables(this.msg);
        } else if (this.state === state.wating) {
            if (this.msg.indexOf("\n") < 0) return;
            this.readResponse(this.msg);
        }

        return;
    }

    setState(state) {
        this.msg = "";
        this.state = state;
    }

    readVariables(msg) {
        let lines = msg.split("\n");

        lines.map((line) => {
            let [name, value] = line.split(":");
            this.variables[name] = (value || "").trim();
        });

        this.setState(state.wating);
        return this.emit("variables", this.variables);
    }

    readResponse(msg) {
        let lines = msg.split("\n");
        lines.map((line) => this.readResponseLine(line));
    }

    readResponseLine(line) {
        this.msg = "";
        if (!line) return;

        let parser = /^(\d{3})(?: result=)([^(]*)(?:\((.*)\))?/.exec(line);

        if (!parser) {
            return this.emit("hangup");
        }

        let response = {
            code: parseInt(parser[1]),
            result: parser[2].trim(),
        };

        if (parser[3]) {
            response.value = parser[3];
        }

        if (this.callback) {
            let cb = this.callback;
            this.callback = null;
            cb(null, response);
        }

        return this.emit("response", response);
    }
}

export default class Context extends EventEmitter {
    constructor(reader, writer) {
        super();
        this.stream = {
            stream_reader: new Context_Reader(reader),
            stream_writer: writer,
        };
        this.createCommand();
        this.types = {
            filestream: this.fork_filestream,
        };
        this.path = "/var/lib/asterisk/agi-bin/";
        this.audio = fs.createReadStream(null, { fd: 3 });
    }

    send(msg, cb) {
        this.stream.stream_writer.write(msg);
        this.stream.stream_reader.callback = cb;
    }

    sendCommand(cmd) {
        return new Promise((resolve, reject) => {
            this.send(cmd + "\n", (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    onEvent(event) {
        return new Promise((resolve) => {
            this.stream.stream_reader.on(event, (data) => {
                resolve(data);
            });
        });
    }

    createCommand() {
        commands.forEach((cmd) => {
            this[cmd.name] = (...args) => {
                let str = "";
                if (cmd.params > 0) {
                    let arg = [].slice.call(...args, 0, cmd.params);
                    str = cmd.command + " " + this.prepareArgs(arg, cmd.paramRules, cmd.params).join(" ");
                } else {
                    str = cmd.command;
                }
                return this.sendCommand(str);
            };
        });
    }

    same(x) {
        return x;
    }

    prepareArgs(args, argsRules, count) {
        const that = this;
        if (!argsRules || !count) {
            return args;
        }

        return Array.apply(null, new Array(count)).map(function (arg, i) {
            arg = args[i] !== undefined && args[i] !== null ? args[i] : (argsRules[i] && argsRules[i].default) || "";
            var prepare = (argsRules[i] && argsRules[i].prepare) || that.same;
            return prepare.call(this, String(arg));
        });
    }

    fork(writestream, timeover) {
        return new Promise((resolve) => {
            const audio = fs.createReadStream(null, { fd: 3 });
            audio.on("data", (chunk) => {
                writestream.write(chunk);
            });

            setTimeout(() => {
                audio.end();
                writestream.end();
                resolve();
            }, timeover);
        });
    }

    fork_type() {
        const [type, etc, timeout, cb] = arguments;
        const writestream = this.types[type].call(this, etc);

        this.audio.pipe(writestream).on("error", (err) => {
            return cb(err, null);
        });

        setTimeout(() => {
            writestream.end();
        }, timeout);

        writestream.on("close", () => {
            return cb(null, "success");
        });
    }

    fork_filestream(filename) {
        const file = this.path + filename;
        return fs.createWriteStream(file);
    }

    forks(type, etc, timeout) {
        return new Promise((resolve, reject) => {
            this.fork_type(type, etc, timeout, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            });
        });
    }

    setForkPath(path) {
        return new Promise((resolve) => {
            this.path = path;
            resolve(this.path);
        });
    }

    end() {
        this.stream.stream_reader.stream.end();
        this.stream.stream_writer.end();

        return Promise.resolve();
    }

    exit() {
        this.end();
        return process.kill(process.pid);
    }
}
