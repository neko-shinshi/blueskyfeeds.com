export const emailPattern = /\S+@\S+\.\S+/;

export const isValidEmail = (email:string) => {
    return emailPattern.test(email);
}
export const isValidDomain = (s:string) => {
    return /^(\*\.)?([a-z\d][a-z\d-]*[a-z\d]\.)+[a-z]+$/.test(s);
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