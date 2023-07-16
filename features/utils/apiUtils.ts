import applyRateLimit from "features/network/applyRateLimit";
import {connectToDatabase} from "features/utils/dbUtils";
import {getServerSession} from "next-auth";
import {authOptions} from "pages/api/auth/[...nextauth]";
import {removeUndefined} from "features/utils/validationUtils";
import {testRecaptcha} from "features/utils/recaptchaUtils";

export const getSession = async (req, res) => {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {return null;}
    return removeUndefined(session);
}

const deduplicatedPromise = (req, res, validation, getDB, callback) => {
    return new Promise(async resolve => {
        try {
            await applyRateLimit(req, res);
        } catch {
            return res.status(429).send('Too many requests');
        }

        const data = req.method == "GET"? req.query : req.body;
        if (!validation(data) || !data.captcha || !(await testRecaptcha(data.captcha))) {
            res.status(400).send(); return;
        }

        if (getDB) {
            const db = await connectToDatabase();
            if (!db) { console.log("NO DB"); res.status(500).send(); return; }
            callback({db});
        } else {
            callback({});
        }
    });
}



export const userPromise = (req, res, type:"POST"|"GET"|"DELETE", captcha, getDB, validation, callback) => {
    if (req.method === type) {
        if (captcha) {
            return deduplicatedPromise(req, res, validation, getDB, async ({db}) => {
                const session = await getSession(req, res)
                if (!session) {
                    res.status(401).send(); return;
                }
                callback({db, session});
            });
        } else {
            return new Promise(async resolve => {
                const session = await getSession(req, res);
                if (!session) {
                    res.status(401).send(); return;
                }

                if (getDB) {
                    const db = await connectToDatabase();
                    if (!db) { console.log("NO DB"); res.status(500).send(); return; }
                    callback({db, session});
                } else {
                    callback({session});
                }
            });
        }
    }
}