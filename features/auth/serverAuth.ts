import {AuthRequiredError, verifyJwt} from "@atproto/xrpc-server";
import { DidResolver, MemoryCache } from '@atproto/did-resolver'
import {parseJwt} from "features/utils/jwtUtils";

const getDidResolver = (): DidResolver => {
    if (!global.didResolver) {
        const didCache = new MemoryCache()
        const didResolver = new DidResolver({ plcUrl: 'https://plc.directory' }, didCache)
        global.didResolver = didResolver;
    }
    return global.didResolver;
}

export const validateAuthGetUser = async (req): Promise<string> => {
    console.log("auth", JSON.stringify(req.headers));
    const { authorization = '' } = req.headers;
    console.log(authorization);
    if (!authorization.startsWith('Bearer ')) {
        console.log("throw");
        throw new AuthRequiredError()
    }
    const jwt = authorization.replace('Bearer ', '').trim();
    console.log(jwt);
    return jwt;
}