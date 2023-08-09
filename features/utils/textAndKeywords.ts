import {toJson} from 'really-relaxed-json'

const splitByNonAlpha = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/).filter(x => x.length > 0);
}

const splitByNonAlphaNumeric = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/).filter(x => x.length > 0);
}

const splitIntoHashtags = (txt) => {
    return txt.split(/[.,\s。、]/).filter(x => x.startsWith("#")).map(x => x.slice(1));
}

const containsNumbers = (str) => {
    return /\d/.test(str);
}

const multipleIndexOf = (text, term) => {
    let indices = [];
    const len = term.length;
    let index=-1, start=0;
    while (start >= 0) {
        index = text.indexOf(term, start);
        if (index >= 0) {
            indices.push([index, index + len - 1]);
            start = index+1;
        } else {
            start = -1;
        }
    }

    return indices;
}


export const preprocessKeywords = async (keywords) => {
    return keywords.map(x => {
        let o = JSON.parse(toJson(x.t));
        o.o = x.t;
        return o;
    }).reduce((acc, x) => {
        let arr = acc[x.t];
        if (!arr) {
            arr = [];
        }
        const {t, ...y} = x;
        if (t === "s" && y.r) { // Pre-processing for segment
            y.r = y.r.map(xx => {
                const {s, p} = xx;
                return {
                    w: [p, y.w, s].filter(z => z).join(""),
                    i: [-p?.length || 0, s?.length || 0]
                }
            });
        }

        arr.push(y);
        acc[t] = arr;

        return acc;
    }, {});
}

const findTokenKeyword = (kw, splitTxt) => {
    const {w, r} = kw;
    const wGroup = w.split(" ");
    const wCombine = wGroup.join("");

    // Find the indices where it passes, then check all negatives based on index
    let indices = [];
    for (let i=0;i<splitTxt.length;i++) {
        const first = splitTxt[i];
        if (first === wCombine) {
            indices.push([i, i]);
        } else if ((i + wGroup.length <= splitTxt.length && wGroup.every((x, j) => x === splitTxt[i + j]))) {
            indices.push([i, i+wGroup.length-1]);
        }
    }

    if (indices.length === 0) {
        return false;
    }

    return !(r && r.some(x => {
        const {p, s} = x;
        const pp = p?.split(" ").reverse() || [];
        const ss = s?.split(" ") || [];
        return indices.some(([a, b]) => {
            return pp.every((y, i) => splitTxt[a-i-1] === y) && ss.every((y, i) => splitTxt[b+i+1] === y);
        });
    }));
}

const findSegmentKeyword = (kw, txt) => {
    const {w, r} = kw;
    const wordIndex = multipleIndexOf(txt, w);
    if (wordIndex.length === 0) {
        return false;
    }
    if (!r) {return true;}

    return !wordIndex.every(([x, y]) =>  r.some(({w, i}) => {
        const substring = txt.slice(x+i[0], y+i[1]+1);
        return substring === w;
    }));
}

const findHashtagKeyword = (kw, splitTxt) => {
    return splitTxt.indexOf(kw.w) >= 0
}

export const findKeywords = (text, _keywords) => {
    const lowText = text.toLowerCase();
    let keywords = [];
    if (_keywords["t"]) {
        const nonAlpha = splitByNonAlpha(lowText);
        const nonAlphaNumeric = splitByNonAlphaNumeric(lowText);

        for (const kw of _keywords["t"]) {
            if (containsNumbers(kw.w) || kw.r?.some(x => containsNumbers(x))) {
                if (findTokenKeyword(kw, nonAlphaNumeric)) {
                    keywords.push(kw.o)
                }
            } else {
                if (findTokenKeyword(kw, nonAlpha)) {
                    keywords.push(kw.o)
                }
            }
        }
    }
    if (_keywords["s"]) {
        for (const kw of _keywords["s"]) {
            if (findSegmentKeyword(kw, lowText)) {
                keywords.push(kw.o)
            }
        }
    }
    if (_keywords["#"]) {
        const hashText = splitIntoHashtags(lowText);
        for (const kw of _keywords["#"]) {
            if (findHashtagKeyword(kw, hashText)) {
                keywords.push(kw.o)
            }
        }
    }

    return keywords;
}

