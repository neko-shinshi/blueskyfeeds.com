import {SUPPORTED_CW_LABELS} from "features/utils/constants";
import {Label} from "@atproto/api";

export function extractLabels (labels:Label[]):string[] | null {
    const map:Map<string, boolean> = new Map();
    for (const label of labels) {
        const {uri, neg, val} = label;
        if (!SUPPORTED_CW_LABELS.includes(val)) { continue; } // Only official labels for now
        const key = `${uri} ${val}`;
        const num = map.get(key);
        switch (num) {
            case false: { break; }
            case undefined:
            case true: {
                if (neg) {
                    map.set(key, false);
                } else {
                    map.set(key, true);
                }
                break;
            }
        }
    }
    return Array.from(Array.from(map.entries()).reduce((acc:Set<string>, x) => {
        const [key, val] = x;
        if (val) { acc.add(key.split(" ")[1]); }
        return acc;
    }, new Set())) as string[];
}