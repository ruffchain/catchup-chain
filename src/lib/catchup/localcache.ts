
import { IFeedBack, ErrorCode } from "../../core";

export let localCache = {
    getCandidates: {},
    getChainOverview: {
        blockHeight: 0,
        irreversibleBlockHeight: 0,
        txCount: 0,
        userCount: 0
    }
};

export function fetchCacheGetCandidates() {
    return new Promise<IFeedBack>(async (resolv) => {
        resolv({
            err: ErrorCode.RESULT_OK, data: localCache.getCandidates
        });
    });
}
