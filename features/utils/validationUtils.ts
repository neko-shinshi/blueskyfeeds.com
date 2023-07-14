export const emailPattern = /\S+@\S+\.\S+/;

export const isValidEmail = (email:string) => {
    return emailPattern.test(email);
}


export function removeUndefined(obj, nullInstead=false) {
    if (typeof obj === "object") {
        Object.keys(obj).forEach(function (key) {
            // Get this value and its type
            var value = obj[key];
            var type = typeof value;
            if (type === "object" && value !== null) {
                // Recurse...
                removeUndefined(value, nullInstead);
                // ...and remove if now "empty" (NOTE: insert your definition of "empty" here)
                if (!nullInstead) {
                    if (!Object.keys(value).length) {
                        delete obj[key]
                    }
                }
            } else if (type === "undefined") {
                // Undefined, remove it
                if (nullInstead) {
                    obj[key] = null;
                } else {
                    delete obj[key]
                }
            }
        });
    }
    return obj;
}
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "1";

export const animeIdHasValidScene = async (db, idAniList:number) => {
    return DEBUG_MODE || !!(await db.scenes.findOne({idAniList, time: {$lt: (new Date()).toISOString()}}));
}