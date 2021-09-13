const agi = require("./eagi/eagi_server/index.js");
const handler = (context) => {
    context.onEvent("variables").then(async (vars) => {
        await context.streamFile("hello-world", "");
        await context.audioFork("read", 5000, async (res) => {
            console.log(res);
        });
        await context.setVariable("saveAudio", "success");

        context.end();
    });
};

agi(handler).start(3600);
