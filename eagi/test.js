#! usr/bin/env node
import fs from "fs";
import { streamContext } from "./wavity/index.js";

const audio_stream = fs.createReadStream(null, { fd: 3 });

streamContext(audio_stream);
setTimeout(() => {}, 10000);
