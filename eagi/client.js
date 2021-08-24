#! usr/bin/env node
//* import
import fs, { read } from "fs";
import net from "net";
import { state } from "./state.js";
import { EventEmitter } from "events";
import { createContext } from "./wavity/index.js";

//* variable
const logger = fs.createWriteStream("/var/lib/asterisk/agi-bin/logger.log");
const success = "200 result=0 endpos=11234 \n";
const log_line = "----------------------------\n";

//* class
class Context extends EventEmitter {
    constructor(ip = "127.0.0.1", port = 3000, stdin = process.stdin, stdout = process.stdout) {
        super();
        this.agi_socket = new AGISocket(ip, port);
        this.asterisk_socket = new AsteriskSocket(stdin, stdout);
        this.agiCallback();
        this.asteriskCallback();
    }

    //* AGI의 콜백 처리하는 부분을 넣습니다.
    agiCallback() {
        this.agi_socket.callback.write = (chunk) => {
            this.agi_socket.socket.write(chunk);
        };
        this.agi_socket.callback.read = (chunk) => {
            this.asterisk_socket.callback.write(chunk);
        };
    }

    //* 아스터리스크의 콜백 처리하는 부분을 넣습니다.
    asteriskCallback() {
        this.asterisk_socket.callback.read = (chunk) => {
            this.agi_socket.callback.write(chunk);
        };

        this.asterisk_socket.callback.write = (chunk) => {
            this.asterisk_socket.stdout.write(chunk);
        };
    }
}

class AGISocket extends EventEmitter {
    constructor(ip, port) {
        super();
        this.socket = net.connect({ host: ip, port: port });
        this.initFunction();
        this.state = state.waiting;
        this.callback = {
            read: null,
            write: null,
        };
        this.msg = "";
        this.audio = new net.Socket({ fd: 3, writable: true });
        this.stop = (timeout) => {
            var variable = setTimeout(() => {
                this.audio.unpipe(this.socket);
                this.state = state.waiting;
                this.callback.write(success);
            }, timeout);
            return variable;
        };
        this.stop_var = null;
    }

    initFunction() {
        this.socket.on("data", (chunk) => {
            this.read(chunk);
        });
    }

    //! AGI에서 오는 패킷을 처리하는 부분입니다.
    async read(chunk) {
        //* 상태에 따라 패킷을 주는 형태를 변경
        if (this.state === state.waiting) {
            logger.write("AGI : " + chunk);
            this.msg += chunk;
            //* 처음 상태일 때에는 \n\n 가 나올때 까지 받고 처리합니다.
            if (this.msg.indexOf("\n") < 0) return;
            return this.sendMessage(this.msg, state.waiting);

            //! 오디오포크를 설정하는 부분입니다.
        } else if (this.state === state.reading) {
            // logger.write(chunk);
            this.msg += chunk;

            if (this.msg.includes(success)) {
                this.msg = "";
                clearTimeout(this.stop_var);
                this.audio.unpipe(this.socket);
                this.state = state.waiting;
                this.callback.write(success);
            }
        }
    }

    async sendMessage(msg, state) {
        logger.write(log_line);
        if (msg.includes("ENDSERVICE")) {
            return process.exit(0);
            //! 오디오 포크 부분을 처리합니다.
        } else if (msg.includes("AUDIOFORK")) {
            this.msg = "";
            const [command, type, timeout] = msg.split(" ");
            this.callback.write(success);
            logger.write(success + log_line);
            return this.audioFork(type, timeout);
        }
        this.msg = "";
        this.state = state;
        this.callback.read(msg);
    }

    //! 오디오 포크 부분을 처리합니다.
    audioFork(type, timeout) {
        if (type === "read") {
            this.state = state.reading;
            this.audio.pipe(this.socket);
            var context = createContext("127.0.0.1", "3000");
            context.streamContext(this.audio).then((value) => {
                this.audio.unpipe(this.socket);
                this.state = state.waiting;
                this.callback.write(success);
            });
            this.stop_var = this.stop(timeout);
        }
    }
}

class AsteriskSocket extends EventEmitter {
    constructor(stdin, stdout) {
        super();
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this.initFunction();
        this.state = state.init;
        this.msg = "";
        this.callback = {
            read: null,
            write: null,
        };
    }

    initFunction() {
        this.stdin.on("data", (chunk) => {
            this.read(chunk);
        });
    }

    //! 아스터리스크 서버에서 오는 패킷을 처리하는 부분입니다.
    async read(chunk) {
        await logger.write("ASTERISK : " + chunk);

        //* 상태에 따라 패킷을 주는 형태를 변경
        if (this.state === state.init) {
            this.msg += chunk;
            //* 처음 상태일 때에는 \n\n 가 나올때 까지 받고 처리합니다.
            if (this.msg.indexOf("\n\n") < 0) return;
            return this.sendMessage(this.msg, state.waiting);
        } else if (this.state === state.waiting) {
            this.msg += chunk;
            if (this.msg.indexOf("\n") < 0) return;
            return this.sendMessage(this.msg, state.waiting);
        }
    }

    //* 메시지가 끝까지 오게 되면 callback을 이용해 해당 함수를 처리합니다.
    async sendMessage(msg, state) {
        await logger.write(log_line);
        this.msg = "";
        this.state = state;
        this.callback.read(msg);
    }
}

new Context();

//* Function & Method
