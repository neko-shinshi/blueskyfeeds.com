import {getLoggedInInfo} from "features/network/session";
import {respondApiErrors} from "features/utils/api";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        console.log("ping check")
        if (req.method !== "GET") { res.status(400).send(); }
        const { error, privateAgent} = await getLoggedInInfo(req, res);
        if (respondApiErrors(res, [{val:error, code:error}, {val:!privateAgent, code:401}])) { return; }

        res.status(200).send();
    });
}