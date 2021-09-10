// const wavity = require("./wavity.js");
// const AudioContext = require("web-audio-api").AudioContext;
// const fs = require("fs");
// const file = fs.createWriteStream("/var/lib/asterisk/agi-bin/hello.log"); // TODO 필요할떄 알아서 쓰세요
// var contextList = new Map();
// var contextCount = 0;

// function WavityContext(ip, port) {
//     var self = this;
//     self.callback = null;
//     self.ip = ip;
//     self.port = port;
//     self.timeout = null;
//     self.reader = null;
//     self.writable = null;
//     self.saveBuffer = Buffer.alloc(1000);
//     self.maxCount = 10;
//     self.count = 0;
//     self.lowSpeak = 0.0;
//     self.say = false;
// }

// WavityContext.prototype.stop = function () {
//     var self = this;
//     self.reader = null;
//     self.writable = null;
// };

// WavityContext.prototype.streamContext = function (writable, timeout) {
//     let self = this,
//         numberOfChannels = 1,
//         sampleRate = 8000,
//         close = false,
//         end = false,
//         context = new AudioContext();
//     self.reader = fs.createReadStream(null, { fd: 3 });
//     self.writable = writable;

//     return new Promise((resolve, reject) => {
//         self.timeout = setTimeout(() => {
//             close = true;
//         }, timeout);

//         self.reader.once("close", () => {
//             resolve();
//         });

//         self.reader.once("error", () => {
//             clearTimeout(self.timeout);
//             resolve();
//         });

//         function clearTime() {
//             if (self.timeout !== null) clearTimeout(self.timeout);
//             self.timeout = null;
//         }

//         function setTime(ms) {
//             clearTime();
//             self.timeout = setTimeout(() => {
//                 close = true;
//             }, ms);
//         }

//         function destory() {
//             clearTime();
//             self.reader.destroy();
//         }

//         self.reader.on("readable", () => {
//             if (close === true && end === false) {
//                 end = true;
//                 destory();
//             } else if (end === true) {
//                 return;
//             } else {
//                 var data = self.reader.read();
//                 var length = data.byteLength;
//                 var isBuffer = "byteLength" in data;
//                 if (data == null || isBuffer == false) {
//                     return;
//                 } else if (Number(length) < 1000 && Number(length) >= 1 && length % 2 === 0) {
//                     hello(data);
//                 } else {
//                     return;
//                 }
//             }
//         });

//         function hello(chunk) {
//             var max = foundMax(chunk);

//             countIncrease(max);
//             file.write(`Say Status : ${self.say} | Max Value : ${max} | LowSpeak Value : ${self.lowSpeak} \n`); // TODO 필요할떄 알아서 쓰세요

//             let speakMinimum = +self.lowSpeak + 0.1;

//             //* 말을 지금 하는 상태 */
//             if (donotSayState() && max > speakMinimum) {
//                 setTime(1500);
//                 self.say = true;
//                 self.writable.write(self.saveBuffer);
//                 self.writable.write(chunk);
//                 return;
//             }

//             //* 말을 안하는 상태 */
//             if (donotSayState()) {
//                 self.saveBuffer = Buffer.concat([self.saveBuffer, chunk]);

//                 if (self.saveBuffer.length > 1000) {
//                     var length = self.saveBuffer.length;
//                     self.saveBuffer.slice(length - 1000, length);
//                 }
//                 return;
//             }

//             //* 말을 한 상태 */
//             if (self.say === true) {
//                 /* 말을 한 상태에서 */
//                 self.writable.write(chunk);
//                 if (max <= speakMinimum) {
//                     // 말을 계속 안한다고 생각하면..
//                     if (self.timeout === null) {
//                         setTime(1500);
//                     }
//                 } else if (max > speakMinimum) {
//                     /* 잡음 상태이면 */
//                     if (self.timeout !== null) {
//                         clearTime();
//                     }
//                 }
//             }
//         }

//         function foundMax(chunk) {
//             var max = 0.0;
//             for (let i = 0; i + 1 < chunk.length; i += 2) {
//                 var msbFirst = (chunk[i] & 0xff) + ((chunk[i + 1] & 0xff) << 8);
//                 var msbSigned = ((msbFirst + 32768) % 65536) - 32768;
//                 var value = msbSigned / 65536.0;
//                 max = value > max ? value.toFixed(3) : max;
//             }
//             return max;
//         }

//         function countIncrease(max) {
//             if (self.count <= self.maxCount) {
//                 self.count++;
//                 self.lowSpeak = self.lowSpeak < max ? max : self.lowSpeak;
//             }
//         }

//         function donotSayState() {
//             return self.say === false && self.count > self.maxCount;
//         }
//     });
// };

// module.exports = (ip, port) => {
//     var key = ip + port + contextCount++;
//     if (contextList.has(key)) {
//         return contextList.get(key);
//     } else {
//         var context = new WavityContext(ip, port);
//         contextList.set(key, context);
//         return context;
//     }
// };
