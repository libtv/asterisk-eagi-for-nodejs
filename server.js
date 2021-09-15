const agi = require("./eagi/eagi_server/index.js");
const handler = (context) => {
    context.onEvent("variables").then(async (vars) => {
        console.log(`${JSON.stringify(vars)} : hello-world 가 실행됩니다.`);
        await context.streamFile("hello-world", "");
        // console.log(`${vars.agi_channel} : 녹음이 시작됩니다.`);
        // await context.audioFork("read", 5000, async (res) => {
        //     console.log(res);
        // });
        // console.log(`${vars.agi_channel} 결과 값을 저장합니다`);
        // await context.setVariable("saveAudio", "success");
        // context.end();

        context.exec("Stasis", "hello");
    });
};

agi(handler).start(3600);
