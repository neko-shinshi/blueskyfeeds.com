import {userPromise} from "features/utils/apiUtils";

export default async function handler(req, res) {
    return userPromise(req, res, "GET", true, false,
        ({feed, captcha}) => !!feed && !!captcha,
        async ({db}) => {

            const {feed:_id} = req.query;
            try {
                const result = await db.feeds.countDocuments({_id});
                if (result === 1) {
                    res.status(200).send("ok");
                    return;
                }

            } catch (e) {
                console.log(e);
            }
            res.status(400).send();
        });
}