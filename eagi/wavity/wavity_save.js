        // function hello(chunk) {
        //     var createbuffer = wavity(chunk, numberOfChannels, sampleRate);
        //     context.decodeAudioData(
        //         createbuffer,
        //         (audioBuffer) => {
        //             let pcmdata = audioBuffer.getChannelData(0);
        //             let max = 0;
        //             for (let i = 0; i < pcmdata.byteLength; i++) {
        //                 max = +pcmdata[i] > max ? +pcmdata[i].toFixed(3) : max;
        //             }

        //             if (count <= maxCount) {
        //                 count++;
        //                 lowSpeak = lowSpeak < max ? max : lowSpeak;
        //             }
        //             let speakMinimum = +lowSpeak + 0.1;
        //             file.write(`Say Status : ${say} | Max Value : ${max} | LowSpeak Value : ${lowSpeak} \n`); // TODO 필요할떄 알아서 쓰세요
        //             /* 말을 안한 상태에서 말을 지금 하는 상태 */
        //             if (say === false && count > maxCount && max > speakMinimum) {
        //                 setTime(1500);
        //                 say = true;

        //                 for (let i = 0; i < speakMaxCount; i++) {
        //                     if (savedBuffer[current] !== null) self.writable.write(savedBuffer[current]);
        //                     current++;
        //                     if (current > speakMaxCount) current = 1;
        //                 }

        //                 // file.write(`############# 그들은 말을 하였습니다.. ${max} > ${speakMinimum} \n`); // TODO 필요할떄 알아서 쓰세요
        //                 self.writable.write(chunk);
        //                 return;
        //                 /* 말을 아예 안하고 있는 상태 */
        //             } else if (say === false && count > maxCount) {
        //                 savedBuffer[current] = chunk;
        //                 if (current > speakMaxCount) {
        //                     current = 1;
        //                 } else {
        //                     current++;
        //                 }
        //                 return;
        //             } else if (say === true) {
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
        //         },
        //         function (err) {
        //             end = true;
        //             destory();
        //             // file.write(`Error : ${err}`); // TODO 필요할떄 알아서 쓰세요
        //         }
        //     );
        // }