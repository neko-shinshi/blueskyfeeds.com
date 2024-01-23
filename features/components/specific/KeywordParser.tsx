import clsx from "clsx";
import {HiMinus, HiPlus} from "react-icons/hi";
import {useEffect, useRef, useState} from "react";

export default function KeywordParser({keyword, children, validateKeyword, handleTokenization, submitKeyword, prefix="", editTag, blockOnly=false}) {
    const [manualKeyword, setManualKeyword] = useState("");
    const [rejectWords, setRejectWords] = useState<{p?:string, s?:string}[]>([]);
    const [error, setError] = useState("");
    const validateAndHandleError = (val, rejectWords) => {
        const err = validateKeyword(val, rejectWords);
        if (err) {
            console.log("error", err);
            setError(err); return false;
        } else {
            setError(""); return true;
        }
    }
    const keywordRef = useRef(null);

    useEffect(() => {
        if (editTag) {
            setManualKeyword(editTag.w);
            keywordRef.current.value = editTag.w;
            setRejectWords(editTag.r || []);
        } else {
            setManualKeyword("");
            keywordRef.current.value = "";
            setRejectWords([]);
        }
    }, [editTag]);

    return <>
        {children}
        <div className="flex justify-between">
            <div className="grow">
                <div className="flex place-items-center">
                    <div className="mr-2">{keyword}</div>
                    {prefix &&
                        <div className="border border-1 border-gray-700 bg-gray-400 p-2 rounded-l-md sm:text-sm">
                            {prefix}
                        </div>
                    }
                    <input
                        ref={keywordRef}
                        type="text"
                        className={clsx("block w-full focus:outline-none sm:text-sm p-2 lowercase",
                            prefix? "rounded-r-md" : "rounded-md",
                            "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                        aria-invalid="true"
                        autoComplete="off"
                        autoCapitalize="none"
                        placeholder={keyword}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                const val = keywordRef.current.value;
                                if (!validateAndHandleError(val, rejectWords)) {return;}
                                submitKeyword(val, rejectWords, !blockOnly);
                                setRejectWords([]);
                                keywordRef.current.value = "";
                            }
                        }}
                        onFocus={() => {setError("");}}
                        onChange={() => {
                            const val = keywordRef.current.value;
                            setManualKeyword(val);
                            validateAndHandleError(val, rejectWords);
                        }}
                    />
                </div>
                {
                    error && <div className="text-red-700">{error}</div>
                }
                {
                    handleTokenization &&
                    <div className="space-y-0.5">
                        <div className="font-semibold text-sm">Ignore Combination</div>
                        {
                            rejectWords.map((x, i) =>
                                <div key={i} className="flex rounded-md shadow-sm place-items-center">
                                    <button type="button"
                                            className="w-12 inline-flex justify-center items-center p-1 m-1 rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            onClick={() => {
                                                rejectWords.splice(i, 1);
                                                setRejectWords([...rejectWords]);
                                            }}>
                                        <HiMinus className="w-6 h-6"/>
                                    </button>
                                    <input
                                        type="text"
                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2 lowercase",
                                            "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                        aria-invalid="true"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        placeholder="Prefix"
                                        onFocus={() => {
                                            setError("");
                                        }}
                                        onChange={(e) => {
                                            rejectWords[i].p = e.target.value.toLowerCase();
                                            setRejectWords([...rejectWords]);
                                            const val = keywordRef.current.value;
                                            validateAndHandleError(val, rejectWords);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        disabled={true}
                                        value={manualKeyword}
                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2 lowercase",
                                            "bg-gray-300")}
                                        placeholder="Keyword"
                                    />
                                    <input
                                        type="text"
                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2 lowercase",
                                            "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                        aria-invalid="true"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        placeholder="Suffix"
                                        onFocus={() => {
                                            setError("");
                                        }}
                                        onChange={(e) => {
                                            rejectWords[i].s = e.target.value.toLowerCase();
                                            setRejectWords([...rejectWords]);
                                            const val = keywordRef.current.value;
                                            validateAndHandleError(val, rejectWords);
                                        }}
                                    />

                                    <input
                                        type="text"
                                        disabled={true}
                                        value={handleTokenization(rejectWords[i], manualKeyword)}
                                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                            "bg-gray-100")}
                                        placeholder="Ignore Combinations"
                                    />
                                </div>
                            )
                        }

                        <button type="button"
                                className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                onClick={() => {
                                    rejectWords.push({});
                                    setRejectWords([...rejectWords]);
                                }}>
                            <HiPlus className="w-6 h-6"/> Append Ignore Combination
                        </button>

                    </div>
                }
            </div>

            <div className="w-24 flex flex-col ">
                {
                    !blockOnly && <button type="button" className="w-full flex-1  bg-lime-200 hover:bg-lime-300" onClick={() => {
                        const val = keywordRef.current.value;
                        if (!validateAndHandleError(val, rejectWords)) {return;}
                        submitKeyword(val, rejectWords, true);
                        setRejectWords([]);
                        keywordRef.current.value = "";
                    }}>
                        Add
                    </button>
                }

                <button type="button" className="w-full flex-1 bg-red-200 hover:bg-red-300" onClick={() => {
                    const val = keywordRef.current.value;
                    if (!validateAndHandleError(val, rejectWords)) {return;}
                    submitKeyword(val, rejectWords, false);
                    setRejectWords([]);
                    keywordRef.current.value = "";
                }}>
                    Block
                </button>
            </div>

        </div>
    </>
}