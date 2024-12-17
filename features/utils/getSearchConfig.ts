import {buildRegExp, choiceOf} from "ts-regex-builder";

function cleanupSpecialCharacters (phrase:string) {
    const specialChars = ["+" , "^", "`", ":", "{", "}", "[", "]", "(", ")", "<", ">", "~", "!", "\\", "*"];
    const regex = buildRegExp([choiceOf(...specialChars)]);
    return phrase.replace(regex, (x) => "\\"+x);
}

export function getSearchConfig(q:string, likes:number = NaN) {
    let t:any = q.split("");
    t = t.reduce((acc, x) => {
        switch (x) {
            case " ": {
                if (acc.carry.indexOf("\"") >= 0) {
                    acc.carry.push(x);
                } else {
                    const carry = acc.carry.filter(x => x !== "\"");
                    acc.arr.push(carry);
                    acc.carry = [];
                }
                break;
            }
            case "\"": {
                if ((acc.carry.length === 1 && acc.carry[0] === "-") || acc.carry.length === 0) {
                    acc.carry.push(x);
                } else if (acc.carry.indexOf("\"") >= 0) {
                    // break carry
                    const carry = acc.carry.filter(x => x !== "\"");
                    acc.arr.push(carry);
                    acc.carry = [];
                } else {
                    // break carry & push ""
                    const carry = acc.carry.filter(x => x !== "\"");
                    acc.arr.push(carry);
                    acc.carry = ["\""];
                }
                break;
            }
            default: {
                acc.carry.push(x);
                break;
            }
        }
        return acc;
    }, {arr:[], carry:[]});
    t = [...t.arr, t.carry].filter(x => x.length > 0).map(x => x.join(""));
    let {o, x} = t.reduce((acc, y) => {
        if (y.startsWith("-")) {
            acc.x.push(cleanupSpecialCharacters(y.slice(1)).split(" "));
        } else {
            acc.o.push(cleanupSpecialCharacters(y).split(" "));
        }
        return acc;
    }, {o:[], x:[]});

    const field = "txt";

    let must:any, mustNot:any;
    if (o.length > 0) {
        must = o.map(item => {
            if (item.length === 1) {
                return {term: {field, value:item[0]}};
            }
            return {phrase: {field, phrases:item}};
        });
    }
    if (x.length > 0) {
        mustNot = x.map(item => {
            if (item.length === 1) {
                return {term: {field, value:item[0]}};
            }
            return {phrase: {field, phrases:item}};
        });
    }

    if (!isNaN(likes) && likes > 0) {
        const item = {
            "range": {
                "field": "likes",
                "lower_bound": {"included": likes},
                "upper_bound": null
            }
        };

        if (must) {
            must.push(item);
        } else {
            must = item;
        }
    }

    let result:any = {boolean:{}};
    if (must) {
        result.boolean.must = must;
    }
    if (mustNot) {
        result.boolean.mustNot = mustNot;
    }

    return result;
}