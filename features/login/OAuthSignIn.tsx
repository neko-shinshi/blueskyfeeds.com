import React, {useRef, useState} from "react";
import clsx from "clsx";
import {HiAtSymbol} from "react-icons/hi";
import {useRouter} from "next/router";
import { Buffer, TO_BASE64URL } from 'next-buffer';
import PopupLoading from "features/components/PopupLoading";

export default function OAuthSignIn({setBusy, busy}) {
    const handleRef = useRef(null);
    const [error, setError] = useState<{msg?:string, part?:string}[]>([]);
    const router = useRouter();

    const validate = (v:string) => {
        if (v.startsWith("did:plc:")) {
            setError([]);
            return true;
        }
        if (v.split(".").filter(x => !!x).length < 2) {
            setError([{msg:"Invalid handle", part:"handle"}]);
            return false;
        }
        setError([]);
        return true;
    }


    const handleSubmit = async (event) => {
        setBusy(true);
        event.preventDefault();
        if (!validate(handleRef.current.value)) { return; }

        let currentUrl = router.pathname;
        if (["/signout", "/401", "/404", "/500"].includes(currentUrl)) { currentUrl = "/"; }

        if (Object.keys(router.query).length > 0) {
            const search = new URLSearchParams();
            Object.entries(router.query).forEach(([key, value]) => {
                search.append(key, `${value}`);
            });
            currentUrl += `?${search.toString()}`;
        }

        currentUrl = Buffer.from(currentUrl).toString(TO_BASE64URL);

        await router.push(`/api/signin?handle=${handleRef.current.value}&back=${currentUrl}`);
        setBusy(false);
    }

    return <div className={
        clsx("inline-block align-bottom bg-white rounded-lg",
            "px-4 pt-5 pb-4 sm:p-6",
            "text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full ")}>
        <PopupLoading isOpen={busy} />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h1 className="mt-3 text-center text-2xl font-extrabold text-gray-900 ">
                <span>Login with Bluesky Account OAuth</span>
            </h1>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <ul className="block text-sm font-medium text-gray-700 list-disc px-4">
                        <li>@Handle (e.g. user.bsky.social)</li>
                        <li>did (e.g did:plc:...)</li>
                        <li>or PDS URL (e.g. https://bsky.social)</li>
                    </ul>
                    <div className="mt-1 relative">
                        <input ref={handleRef}
                               id="handle"
                               name="handle"
                               type="text"
                               onChange={(event) => {
                                   const v = event.target.value;
                                   validate(v);
                               }}
                               required
                               className={clsx("pl-8 appearance-none block w-full px-3 py-2",
                                   error.find(x => x.part === "all") && "border-red-600",
                                   "border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
                                   "focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm")}
                        />
                        <div
                            className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none">
                            <HiAtSymbol className="w-4 h-4"/>
                        </div>


                    </div>
                </div>


                {
                    error.length > 0 && <div className="text-red-600 text-sm">
                        {error[0].msg}
                    </div>
                }

                <div>
                    <button
                        disabled={busy || error.length > 0}
                        type="submit"
                        className={
                            clsx("w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2",
                                "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500")
                        }>
                        Continue

                        {
                            busy && <div role="status" className="ml-2">
                                <svg aria-hidden="true"
                                     className="inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                                     viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                        fill="currentColor"/>
                                    <path
                                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                        fill="currentFill"/>
                                </svg>
                                <span className="sr-only">Loading...</span>
                            </div>
                        }
                    </button>
                </div>

                <div className="text-sm">This site uses cookies to store and retrieve user session data within your browser and
                    processes it with each request. It does not save it in the server.
                </div>

            </form>
        </div>

    </div>
}