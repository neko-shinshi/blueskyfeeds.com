export const splitByNonAlpha = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/);
}

export const splitByNonAlphaNumeric = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/);
}

export const splitIntoHashtags = (txt) => {
    return txt.split(/[.,\s。]/).filter(x => x.startsWith("#"));
}

export const multipleIndexOf = (text, terms) => {
    let indices = [];
    for (const term of terms) {
        let index=-1, start=0;
        while (start >= 0) {
            index = text.indexOf(term, start);
            if (index >= 0) {
                indices.push(index);
                start = index+1;
            } else {
                start = -1;
            }
        }
    }

    return indices;
}

export const compressedToJsonString = (txt) => {
    return txt.split("").reduce((acc, v, i, full) => {
        switch (v) {
            case "{": {
                acc.push("{\"");
                break;
            }
            case "}": {
                if (full.at(i-1) !== "]") {
                    acc.push("\"");
                }
                acc.push("}");
                break;
            }
            case ":": {
                acc.push("\":");
                if (full.at(i+1) !== "[") {
                    acc.push("\"");
                }
                break;
            }
            case ",": {
                if (full.at(i-1) !== "}") {
                    acc.push("\"");
                }
                acc.push(",");
                if (full.at(i+1) !== "{") {
                    acc.push("\"");
                }
                break;
            }
            default: {
                acc.push(v);
            }
        }
        return acc;
    }, []).join("");
}