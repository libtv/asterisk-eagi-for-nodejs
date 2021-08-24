import { wavify } from "./wavity.js";
import { concat } from "./concat.js";
import fs from "fs";
import { AudioContext } from "web-audio-api";

export const streamContext = (reader) => {
    let context = new AudioContext();
    var rest = null;
    let isFirstBuffer = true;
    let isFirstFunc = true;
    let numberOfChannels, sampleRate;
    let buffer, segment;
    const audioStack = [];

    reader.on("data", (chunk) => {
        //* value와 버퍼가 있으면 실행하는데,, */
        if (chunk.buffer) {
            //* rest 가 있으면 buffer에 합쳐주고 */
            if (rest !== null) {
                buffer = concat(rest, chunk.buffer);
            } else {
                buffer = chunk.buffer;
            }

            //* 오류이면 */
            if (isFirstBuffer && buffer.byteLength <= 44) {
                rest = buffer;
                return;
            }

            //* 첫번째 버퍼이면 채널의수, sampleRate를 찾고 그만큼의 버퍼를 자름 */
            if (isFirstBuffer) {
                isFirstBuffer = false;

                const dataView = new DataView(buffer);
                numberOfChannels = dataView.getUint16(22, true);
                sampleRate = dataView.getUint32(24, true);
                buffer = buffer.slice(44);
                console.log(numberOfChannels);
            }

            let createbuffer = wavify(buffer, numberOfChannels, sampleRate);
            segment = {};

            context.decodeAudioData(
                createbuffer,
                function (audioBuffer) {
                    segment.buffer = audioBuffer;
                    audioStack.push(segment);
                    if (isFirstFunc) scheduleBuffers();
                },
                function (err) {
                    throw err;
                }
            );
        }
    });

    const scheduleBuffers = async () => {
        isFirstFunc = false;
        while (audioStack.length > 0 && audioStack[0].buffer !== undefined) {
            const audioBuffer = audioStack.shift().buffer;
            let pcmdata = audioBuffer.getChannelData(0);
            let samplerate = audioBuffer.sampleRate;
            await findPeaks(pcmdata, samplerate);
        }
    };
};

function findPeaks(pcmdata, samplerate) {
    return new Promise((resolve, reject) => {
        var interval = 0.05 * 1000;
        let index = 0;
        var step = Math.round(samplerate * (interval / 1000));
        var max = 0;

        //loop through song in time with sample rate
        var samplesound = setInterval(
            function () {
                if (index >= pcmdata.length) {
                    clearInterval(samplesound);
                    resolve("end");
                }

                for (var i = index; i < index + step; i++) {
                    max = pcmdata[i] > max ? pcmdata[i].toFixed(1) : max;
                }

                console.log(max);
                max = 0;
                index += step;
            },
            interval,
            pcmdata
        );
    });
}

const file = fs.createReadStream("./test.wav");
streamContext(file);
