import clsx from "clsx";
import {HiMinus, HiPlus} from "react-icons/hi";
import {useRef, useState} from "react";

export default function ModalManualSearch({keyword, children, validateKeyword, handleTokenization, submitKeyword}) {
    const [manualKeyword, setManualKeyword] = useState("");
    const [rejectWords, setRejectWords] = useState<{pre:string, suf:string}[]>([]);
    const [error, setError] = useState("");
    const validateAndHandleError = (val) => {
        const err = validateKeyword(val);
        if (err) {
            setError(err); return false;
        } else {
            setError(""); return true;
        }
    }
    const ref = useRef(null);
    return <>
        {children}
        <div className="flex justify-between">
            <div className="grow">
                <div className="flex place-items-center space-x-2">
                    <div>{keyword}</div>
                    <input
                        ref={ref}
                        type="text"
                        className={clsx("block w-full focus:outline-none sm:text-sm rounded-md p-2",
                            "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                        aria-invalid="true"
                        autoComplete="off"
                        autoCapitalize="none"
                        placeholder={keyword}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                const val = ref.current.value;
                                if (!validateAndHandleError(val)) {return;}
                                submitKeyword(val, rejectWords);
                                setRejectWords([]);
                                ref.current.value = "";
                            }
                        }}
                        onFocus={() => {setError("");}}
                        onChange={() => {
                            const val = ref.current.value;
                            setManualKeyword(val);
                            validateAndHandleError(val);
                        }}
                    />
                </div>
                {
                    error && <div className="text-red-700">{error}</div>
                }
                <div className="space-y-0.5">
                    <div className="font-semibold text-sm">Reject Combination</div>

                    {
                        rejectWords.map((x,i) =>
                            <div key={i} className="flex rounded-md shadow-sm place-items-center">
                                <button type="button"
                                        className="w-12 inline-flex justify-center items-center p-1 m-1 rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                        onClick={() => {
                                            rejectWords.splice(i,1);
                                            setRejectWords([...rejectWords]);
                                        }}>
                                    <HiMinus className="w-6 h-6"/>
                                </button>
                                <input
                                    type="text"
                                    className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                        "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                    aria-invalid="true"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    placeholder="Prefix"
                                    onFocus={() => {setError("");}}
                                    onChange={(e) => {
                                        rejectWords[i].pre = e.target.value;
                                        setRejectWords([...rejectWords]);
                                    }}
                                />
                                <input
                                    type="text"
                                    disabled={true}
                                    value={manualKeyword}
                                    className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                        "bg-gray-300")}
                                    placeholder="Keyword"
                                />
                                <input
                                    type="text"
                                    className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                        "focus:border-gray-500 focus:ring-gray-500 border-gray-300 text-gray-900 placeholder-gray-300")}
                                    aria-invalid="true"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    placeholder="Suffix"
                                    onFocus={() => {setError("");}}
                                    onChange={(e) => {
                                        rejectWords[i].suf = e.target.value;
                                        setRejectWords([...rejectWords]);
                                    }}
                                />

                                <input
                                    type="text"
                                    disabled={true}
                                    value={handleTokenization(rejectWords[i], manualKeyword)}
                                    className={clsx("block w-full focus:outline-none sm:text-sm rounded-l-md p-2",
                                        "bg-gray-100")}
                                    placeholder="Reject combination"
                                />
                            </div>
                        )
                    }
                    <button type="button"
                            className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={() => {
                                rejectWords.push({pre:"", suf:""});
                                setRejectWords([...rejectWords]);
                            }}>
                        <HiPlus className="w-6 h-6"/> Append Reject Combination
                    </button>
                </div>
            </div>

            <button type="button" className="w-24  bg-orange-200" onClick={() => {
                const val = ref.current.value;
                if (!validateAndHandleError(val)) {return;}
                submitKeyword(val, rejectWords);
                setRejectWords([]);
                ref.current.value = "";
            }}>
                Add {keyword}
            </button>
        </div>
    </>
}