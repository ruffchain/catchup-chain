
import { IFeedBack, ErrorCode } from "../../core";

export let localCache = {
    getCandidates: {}
};

export function fetchCacheGetCandidates() {
    return new Promise<IFeedBack>(async (resolv) => {
        resolv({ err: ErrorCode.RESULT_OK, data: localCache.getCandidates })
    });
}
