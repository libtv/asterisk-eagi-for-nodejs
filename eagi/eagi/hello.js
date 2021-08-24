#! usr/bin/env node
import agi from "./index.js";

async function handler(context) {
    await context.onEvent("variables").then(async (vars) => {
        await context.answer();
        // await context.setAutoHangup(["5"]);
        // const channel = await context.getVariable(["CHANNEL"]);
        // const values = await context.channelStatus([channel.value]);
        // console.log(values.value);

        // const res = await context.getVariable(["ticketID"]);
        // if (vars.agi_arg_2 === "77771") {
        //     await context.streamFile(["covid_default"]);
        // } else {
        //     let dfmf = await context.getData(["covid_dtmf", "5000", "4"]);
        //     if (dfmf.result == "") {
        //         dfmf = await context.getData(["covid_dtmf", "5000", "4"]);
        //     }
        //     // db전송
        // }
        await context.streamFile(["hello-world"]);

        await context.setForkPath("/var/lib/asterisk/agi-bin/");

        // await context.forks("filestream", vars.agi_arg_1, 3000);
        await context.forks("filestream", "myOutput.raw", 3000);
        await context.streamFile(["hello-world"]);
        await context.setVariable(["junho", "hello"]);
        /* 시간을 체크합니다 */
        // const dfmf = await context.getData(["hello-world", "5000", "4"]);
        // console.log(dfmf.result);
        /* 시간 체크 끝 */
        await context.exit();
    });
}

async function main() {
    const server = agi(handler);
    await server.start();
}

main();
