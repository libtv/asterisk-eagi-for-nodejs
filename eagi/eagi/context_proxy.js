export default function context_Proxy(context) {
    return new Proxy(context, handler);
}

const handler = {
    get: (target, property) => {
        if (property === "channelStatus") {
            return new Promise(async (resolve) => {
                let result = await target.channelStatus(...arguments);
                switch (result.result) {
                    case "0":
                        result.value = "채널이 종료되어 사용 가능합니다.";
                        break;
                    case "1":
                        result.value = "채널이 다운되었지만 예약되어 있습니다.";
                        break;
                    case "2":
                        result.value = "현재 이 채널은 사용가능하지 않습니다.";
                        break;
                    case "3":
                        result.value = "다이얼되고 있습니다.";
                        break;
                    case "4":
                        result.value = "회선이 울리고 있습니다.";
                        break;
                    case "5":
                        result.value = "상대방의 전화가 울리고 있는 상태입니다.";
                        break;
                    case "6":
                        result.value = "전화 연결 중 입니다.";
                        break;
                    case "7":
                        result.value = "회선이 통화 중 입니다.";
                        break;
                    default:
                        result.value = "알 수 없는 오류입니다.";
                        break;
                }
                resolve(result);
            });
        }
        return target[property];
    },
};
