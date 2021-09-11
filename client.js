#! usr/bin/env node
//* import
const fs = require("fs");
const net = require("net");
const state = require("./eagi/state.js");
const EventEmitter = require("events").EventEmitter;
const createContext = require("./eagi/util/fd3");

//* variable
// const logger = fs.createWriteStream("/var/lib/asterisk/agi-bin/logger.log"); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
// const log_line = "----------------------------\n";
const success = "200 result=0 AUDIOFORK START \n";
const audioforkSuccess = "200 result=0 AUDIOFORK SUCCESS \n";

//* class
class Context extends EventEmitter {
    constructor(ip = "127.0.0.1", port = 3600) {
        super();
        this.agi_socket = new AGISocket(ip, port);
        this.asterisk_socket = new AsteriskSocket();
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
        this.agi_socket.callback.changeState = (state) => {
            this.agi_socket.state = state;
            this.asterisk_socket.state = state;
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
            changeState: null,
        };
        this.msg = "";
        this.context = createContext("127.0.0.1", "3000");
    }

    initFunction() {
        this.socket.on("data", (chunk) => {
            this.read(chunk);
        });

        this.socket.on("error", this.emit.bind(this, "error"));
        this.socket.on("close", this.emit.bind(this, "close"));
    }

    //! AGI에서 오는 패킷을 처리하는 부분입니다.
    async read(chunk) {
        // logger.write("AGI->ASTERISK : " + chunk); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
        //* 상태에 따라 패킷을 주는 형태를 변경
        if (this.state === state.waiting) {
            // logger.write("AGI->ASTERISK : " + chunk); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
            this.msg += chunk;
            if (this.msg.indexOf("\n") < 0) return;
            return this.sendMessage(this.msg);
        } else if (this.state === state.reading) {
            this.msg = "";
        }
    }

    async sendMessage(msg) {
        // logger.write(log_line); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
        this.msg = "";
        if (msg.includes("ENDSERVICE")) {
            return process.exit(0);
        } else if (msg.includes("AUDIOFORK")) {
            //! 오디오 포크 부분을 처리합니다.
            const [command, type, timeout] = msg.split(" ");
            this.callback.write(success);
            // logger.write(success + log_line); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
            return this.audioFork(type, timeout);
        } else {
            this.callback.read(msg);
        }
    }

    //! 오디오 포크 부분을 처리합니다.
    async audioFork(type, timeout) {
        if (type === "read") {
            this.callback.changeState(state.reading);

            try {
                await this.context.streamContext(this.socket, timeout);
            } catch (err) {
            } finally {
                this.callback.changeState(state.waiting);
                this.msg = "";
                this.context.stop();
                this.callback.write(audioforkSuccess);
            }
        }
    }
}

class AsteriskSocket extends EventEmitter {
    constructor() {
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
        // logger.write("ASTERISK->AGI : " + chunk); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -

        //* 상태에 따라 패킷을 주는 형태를 변경
        if (this.state === state.init) {
            this.msg += chunk;
            //* 처음 상태일 때에는 \n\n 가 나올때 까지 받고 처리합니다.
            if (this.msg.indexOf("\n\n") < 0) return;
            this.state = state.waiting;
            return this.sendMessage(this.msg);
        } else if (this.state === state.waiting) {
            this.msg += chunk;
            if (this.msg.indexOf("\n") < 0) return;
            return this.sendMessage(this.msg);
        } else if (this.state === state.reading) {
            this.msg = "";
            return;
        }
    }

    //* 메시지가 끝까지 오게 되면 callback을 이용해 해당 함수를 처리합니다.
    async sendMessage(msg) {
        // logger.write(log_line); // TODO 필요할 떄 알아서 꺼내서 쓰세요 - 로그 -
        this.msg = "";
        this.callback.read(msg);
    }
}

new Context("127.0.0.1", 3600);
