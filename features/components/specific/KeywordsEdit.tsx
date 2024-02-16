import clsx from "clsx";
import {KEYWORD_TYPES, KeywordType, KeywordTypeToShort, MAX_KEYWORDS_PER_LIVE_FEED} from "features/utils/constants";
import KeywordParser from "features/components/specific/KeywordParser";
import {isValidToken} from "features/utils/validationUtils";
import SortableWordBubbles from "features/components/SortableWordBubbles";
import {useState} from "react";

export default function KeywordsEdit({keywords, setKeywords, VIP, bg="bg-lime-100", setDirty, blockOnly=false}: {keywords, setKeywords, VIP, bg?, setDirty?, blockOnly?}) {
    const [editTag, setEditTag] = useState<any>(null);
    const [newKeywordMode, setNewKeywordMode] = useState<KeywordType>("token");

    const validateKeyword = (term, rejectWords, transform) => {
        if (term.length === 0) {
            return "Term is empty";
        }
        if (!VIP && keywords.length >= MAX_KEYWORDS_PER_LIVE_FEED) {
            return `Too many keywords, max ${MAX_KEYWORDS_PER_LIVE_FEED}`;
        }

        const modeShort = KeywordTypeToShort(newKeywordMode)
        if (keywords.find(y => y.w === term && y.t === modeShort)) {
            return "Term is already in keywords";
        }
        let set = new Set();
        set.add(term);
        console.log(set);
        for (const [i,r] of rejectWords.entries()) {
            const combined = transform(r, term);
            if (set.has(combined)) {
                return `Duplicate or empty Ignore Combination at #${i+1}: ${combined}`;
            }
            set.add(combined);
        }
        return null;
    }

    return  <div>
        <div className={clsx("font-semibold text-lg p-2", bg)}>There are three ways keywords are filtered, tap the <span className="text-pink-600">different</span> <span className="text-yellow-600">colored</span> <span className="text-sky-600">tabs</span> below to see their differences</div>
        <div className={clsx("grid grid-cols-3")}>
            {
                KEYWORD_TYPES.map((x, i) =>
                    <div key={x} className={clsx(
                        ["bg-pink-100 hover:bg-pink-200", "bg-yellow-100 hover:bg-yellow-200", "bg-sky-100 hover:bg-sky-200"][i],
                        "flex items-center p-2 border border-x-2 border-t-2 border-b-0 border-black")}
                         onClick={() => {
                             setNewKeywordMode(x);
                         }}>
                        <input
                            id='keyword-filter-type'
                            type="radio"
                            value={x}
                            checked={newKeywordMode === x}
                            onChange={() => {}}
                            onClick={() => {setNewKeywordMode(x)}}
                            className="mr-2 focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        {x.slice(0,1).toUpperCase()+x.slice(1)}
                    </div>)
            }
        </div>

        <div className={clsx("p-2 border border-l-2 border-r-2 border-y-0 border-black",
            newKeywordMode === "token" && "bg-pink-100",
            newKeywordMode === "segment" && "bg-yellow-100",
            newKeywordMode === "hashtag" && "bg-sky-100"
        )}>
            <div className="font-semibold">{`${newKeywordMode.slice(0,1).toUpperCase()}${newKeywordMode.slice(1)} Search`}</div>
            {
                newKeywordMode === "token" &&
                <KeywordParser
                    editTag={editTag}
                    keyword="Token"
                    blockOnly={blockOnly}
                    handleTokenization={(r, term) =>  [r.p, term, r.s].filter(x => x).join(" ")}
                    validateKeyword={(word, reject) => {
                        const trimmed = word.trim();
                        if (!isValidToken(trimmed)) {
                            return `Invalid keyword: Alphanumeric with accents and spaces only a-zA-ZÀ-ÖØ-öø-ÿ0-9`;
                        }
                        return validateKeyword(trimmed, reject, (r, term) =>  [r.p, term, r.s].filter(x => x).join(" "));
                    }}
                    submitKeyword={(w, r, a) => {
                        setKeywords([...keywords, {t:"t", w:w.toLowerCase().trim(), a, r}]);
                        setEditTag(null);
                        if (setDirty) {
                            setDirty(true);
                        }
                    }}>
                    <ul className="list-disc pl-4">
                        <li ><span className="font-bold">Does not work for non-latin languages</span> like Korean, Mandarin or Japanese, use <span className="font-bold underline">Segment</span> Mode</li>
                        <li>In token mode, posts and search terms are set to lowercase, then split into individual words (tokens) by splitting them by non latin characters (i.e. spaces, symbols, 言,  ل) e.g. `this is un-funny.jpg` becomes `this` `is` `un `funny` `jpg`</li>
                        <li>The search term is searched both separately e.g. `quickdraw` and `quick draw` will also find `#quickdraw`</li>
                        <li>Works for terms with accents like `bon appétit`</li>
                        <li>Might not work well if the term is combined with other terms, e.g. searching for `cat` will not find `caturday`, search for `caturday` separately or use Segment mode</li>
                        <li>A desired token might often appear with undesired terms, like `one piece swimsuit` when looking for the anime `one piece`</li>
                        <li>To prevent this, use an ignore combination to add `swimsuit` to reject `one piece swimsuit` if it appears but accept `one piece`</li>
                    </ul>
                </KeywordParser>
            }
            {
                newKeywordMode === "segment" && <KeywordParser
                    editTag={editTag}
                    keyword="Segment"
                    blockOnly={blockOnly}
                    handleTokenization={(r, term) =>  [r.p, term, r.s].filter(x => x).join("")}
                    validateKeyword={(word, reject) => {
                        const trimmed = word.trim();
                        return validateKeyword(trimmed, reject, (r, term) =>  [r.p, term, r.s].filter(x => x).join(""));
                    }}
                    submitKeyword={(w, r, a) => {
                        setKeywords([...keywords, {t:"s", w:w.toLowerCase().trim(), a, r}]);
                        setEditTag(null);
                        if (setDirty) {
                            setDirty(true);
                        }
                    }}>
                    <ul className="list-disc pl-4">
                        <li>Posts are searched character-by-character, but may accidentally find longer words that include the search terms</li>
                        <li>For example: `cat` is inside both `concatenation` and `cataclysm`</li>
                        <li>To prevent this, add the prefix and suffix of common terms to reject</li>
                        <li>This is the preferred way to search for non-latin words like アニメ</li>
                    </ul>
                </KeywordParser>
            }

            {
                newKeywordMode === "hashtag" && <KeywordParser
                    editTag={editTag}
                    keyword="Hashtag"
                    blockOnly={blockOnly}
                    prefix="#"
                    handleTokenization={null}
                    validateKeyword={term => {
                        if (!VIP && keywords.length >= MAX_KEYWORDS_PER_LIVE_FEED) {
                            return `Too many keywords, max ${MAX_KEYWORDS_PER_LIVE_FEED}`;
                        }
                        if (term.startsWith("#")) {
                            return "Hashtag does not need to start with #, already handled by server";
                        }
                        if (keywords.find(x => x.t === "#" && x.w === term)) {
                            return "Hashtag already in list";
                        }
                        return null;
                    }} submitKeyword={(w, rejectWords, a) => {
                    setKeywords([...keywords, {t:"#", w:w.toLowerCase().trim(), a}]);
                    setEditTag(null);
                    if (setDirty) {
                        setDirty(true);
                    }
                }}
                >
                    <ul className="list-disc pl-4">
                        <li>Posts are searched for hashtags</li>
                    </ul>
                </KeywordParser>
            }
            <div className="mt-4 font-semibold">Keywords ({keywords.length}{!VIP && `/${MAX_KEYWORDS_PER_LIVE_FEED}`})</div>
            <SortableWordBubbles
                className="mt-2"
                value={keywords}
                selectable={true}
                valueModifier={(val) => {
                    switch (val.t) {
                        case "#":
                            return `#${val.w}`;
                        case "s": {
                            const v = val.r.length === 0? "": ` -[${val.r.map(x =>  [x.p, val.w, x.s].filter(x => x).join("")).join(", ")}]`;
                            return `[${val.w}]${v}`;

                        }
                        case "t": {
                            const v = val.r.length === 0? "": ` -[${val.r.map(x =>  [x.p, val.w, x.s].filter(x => x).join(" ")).join(", ")}]`;
                            return `${val.w}${v}`;
                        }
                    }
                    return `#${JSON.stringify(val)}`;
                }}
                classModifier={(val, index, original) => {
                    if (editTag && editTag.w === val.w) {
                        return original.replace("bg-white", "bg-gray-200 hover:bg-gray-300");
                    } else if (val.a) {
                        return original.replace("bg-white", "bg-lime-100 hover:bg-lime-300");
                    } else {
                        return original.replace("bg-white", "bg-red-300 hover:bg-red-500");
                    }
                }}
                buttonCallback={(val, action) => {
                    if (action === "x") {
                        setKeywords([...keywords.filter(x => !(x.t === val.t && x.w === val.w))]);
                    } else if (action === "o") {
                        if (editTag && editTag.w === val.w) {
                            setEditTag(null)
                        } else {
                            switch (val.t) {
                                case "t": {setNewKeywordMode('token'); break;}
                                case "s": {setNewKeywordMode('segment'); break;}
                                case "#": {setNewKeywordMode('hashtag'); break;}
                            }
                            setEditTag(val);
                        }

                        // change type to match tag, fill up form, remove from list
                    }
                }} />
        </div>
    </div>
}