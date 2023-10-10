import {toRJson} from 'really-relaxed-json'
export const dotObjectStringPath = (o, path) => {
    let oo = o;
    path.split(".").forEach(x => {
        if (!oo) {
            return null;
        }
        oo = oo[x];
    });
    return oo;
}

export const objectToDotNotation = (o, header=null) => {
    const headerString = !header? "": `${header}.`;
    let l = [];

    for (const [key, value] of Object.entries(o)) {
        if (typeof value === 'object' && value !== null) {
            l.push(...objectToDotNotation(value, `${headerString}${key}`));
        } else {
            const newKey = `${headerString}${key}`;
            let newO = {};
            newO[newKey] = value;
            l.push(newO);
        }
    }
    return l;
}

const escapeRelaxed = (s) => {
    return s.replaceAll("*", "\\*").replaceAll("/", "\\/");
}


export const compressKeyword = (x) => {
    const {a, ...y} = x;
    y.w = escapeRelaxed(y.w.toLowerCase());
    if (Array.isArray(y.r)) {
        if (y.r.length === 0) {
            delete y.r;
        } else {
            y.r.forEach(z => {
                if (z.p === "") {
                    delete z.p;
                } else if (z.p) {
                    z.p = escapeRelaxed(z.p.toLowerCase());
                }
                if (z.s === "") {
                    delete z.s;
                } else if (z.s) {
                    z.s = escapeRelaxed(z.s.toLowerCase());
                }
            });
            y.r.sort((a,b) => {
                const ll = [a.p, y.w, a.s].filter(l => l).join("");
                const rr = [b.p, y.w, b.s].filter(r => r).join("");
                return ll.localeCompare(rr);
            });
        }
    }
    return {
        t: toRJson(JSON.stringify(y)), // more than one backslash fails
        a: x.a // This is not used by the firehose
    };
}