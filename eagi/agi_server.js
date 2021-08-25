import { agi } from "./eagi_server/index.js";
import fs from "fs";

const handler = (context) => {
    context.onEvent("variables").then(async (vars) => {
        console.log("welcome");
        var file = fs.createWriteStream("/var/lib/asterisk/agi-bin/test.raw");
        await context.answer();
        await context.streamFile("hello-world");

        const c = await context.audioFork("read", 10000, async (res, client) => {
            file.write(res);
        });
        console.log(c);
        await context.streamFile("hello-world");
        const d = await context.audioFork("read", 10000, (res, client) => {
            file.write(res);
        });
        console.log(d);
        await context.streamFile("hello-world");
        const e = await context.end();
        console.log(e);
    });
};

agi(handler).start(3000);
