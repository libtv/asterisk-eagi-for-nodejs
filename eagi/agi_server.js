import { agi } from "./eagi_server/index.js";
import fs from "fs";

const handler = (context) => {
    context.onEvent("variables").then(async (vars) => {
        console.log("welcome");
        var file = fs.createWriteStream("/var/lib/asterisk/agi-bin/test.raw");
        await context.answer();
        await context.streamFile("hello-world");

        const c = await context.audioFork("read", 10000, (res, client) => {
            file.write(res);
        });
        console.log(c);
        await context.streamFile("hello-world");
        await context.end();
    });
};

agi(handler).start(3000);
