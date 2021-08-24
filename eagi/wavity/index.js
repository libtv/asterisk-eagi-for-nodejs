import fs, { read } from "fs";
import { wavify } from "./wavity.js";
import { AudioContext } from "web-audio-api";
const logger = fs.createWriteStream("/var/lib/asterisk/agi-bin/eagi/wavity/logger.log");
var file = fs.createWriteStream("/var/lib/asterisk/agi-bin/test2.raw");
var contextList = new Map();

function WavityContext(ip, port) {
    var self = this;
    self.callback = null;
    self.ip = ip;
    self.port = port;
}

WavityContext.prototype.setCallback = function (callback) {
    var self = this;
    self.callback = callback;
};

WavityContext.prototype.streamContext = function (reader) {
    var self = this;
    return new Promise((resolve, reject) => {
        let context = new AudioContext();
        let numberOfChannels = 1,
            sampleRate = 8000;
        var interval = 0.05 * 1000;
        let buffer;
        var step = Math.round(8000 * (interval / 1000));
        var say = false;

        reader.on("data", (chunk) => {
            //* value와 버퍼가 있으면 실행하는데,, */
            if (chunk.buffer) {
                if (self.callback) {
                    self.callback(chunk);
                }
                buffer = chunk.buffer;
                let createbuffer = wavify(buffer, numberOfChannels, sampleRate);
                file.write(chunk);

                context.decodeAudioData(
                    createbuffer,
                    function (audioBuffer) {
                        let pcmdata = audioBuffer.getChannelData(0);
                        let max = 0;
                        for (let i = 0; i < step; i++) {
                            max = pcmdata[i] > max ? pcmdata[i].toFixed(1) : max;
                        }
                        logger.write(max + "\n");
                        if (max >= 0.7 && !say) {
                            say = true;
                        } else if (say) {
                            if (max <= 0.0) {
                                return resolve(max);
                            }
                        }
                    },
                    function (err) {
                        throw err;
                    }
                );
            }
        });
    });
};

export const createContext = (ip, port) => {
    var key = ip + port;
    if (contextList.has(key)) {
        return contextList.get(key);
    } else {
        var context = new WavityContext(ip, port);
        contextList.set(key, context);
        return context;
    }
};
