export const emailPattern = /\S+@\S+\.\S+/;

export const isValidEmail = (email:string) => {
    return emailPattern.test(email);
}
export const isValidDomain = (s:string) => {
    return /^(\*\.)?([a-z\d][a-z\d-]*[a-z\d]\.)+[a-z]+$/.test(s);
}
const noPadding = (s:string) => {
    return /[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{1}.*[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{1}/.test(s);
}

export const isValidToken = (s:string) => {
    return /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9 ]+$/.test(s);
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

export const validateKeywords = (keywords) => {
    const validateR = (r) => {
        return Array.isArray(r) &&
            r.every(y => (typeof y.p === 'string' || y.p instanceof String || typeof y.s === 'string' || y.s instanceof String));
    }
    return keywords.filter(x => {
        const {w,t,r,a, ...other} = x;
        if (!noPadding(w)) {return false;}

        if (Object.keys(other).length === 0 && (typeof w === 'string' || w instanceof String) && typeof a == "boolean" ) {
            switch (t) {
                case "t": {
                    if (validateR(r) && isValidToken(w.toString())) {
                        let set = new Set([w.toString()]);
                        // each item must also be a valid token
                        // no duplicates
                        // not empty
                        return r.every(y => {
                            if (!(noPadding(y.p) && noPadding(y.s))) {return false;}
                            const term = [y.p, w, y.s].join(" ");
                            if (set.has(term) || !isValidToken(term)) {
                                return false;
                            }
                            set.add(term);
                        });
                    }
                    return false;
                }
                case "s": {
                    return validateR(r);
                }
                case "#": {
                    return true;
                }
            }
        }

        return false;
    });
}