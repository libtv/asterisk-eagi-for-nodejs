import Context from "./context.js";
import context_Proxy from "./context_proxy.js";

export default function agi(handler, stdin = process.stdin, stdout = process.stdout) {
    const context = new Context(stdin, stdout);
    const decoration_context = context_Proxy(context);
    return {
        start: () => {
            return handler(decoration_context);
        },
    };
}
