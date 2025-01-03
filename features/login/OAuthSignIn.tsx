import {useRef, useState} from "react";
import clsx from "clsx";
import {HiAtSymbol} from "react-icons/hi";
import {useRouter} from "next/router";
import { Buffer, TO_BASE64URL } from 'next-buffer';

export default function OAuthSignIn() {
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
        event.preventDefault();
        if (!validate(handleRef.current.value)) { return; }

        let currentUrl = router.pathname;

        if (Object.keys(router.query).length > 0) {
            const search = new URLSearchParams();
            Object.entries(router.query).forEach(([key, value]) => {
                search.append(key, `${value}`);
            });
            currentUrl += `?${search.toString()}`;
        }

        currentUrl = Buffer.from(currentUrl).toString(TO_BASE64URL);

        await router.push(`/api/signin?handle=${handleRef.current.value}&back=${currentUrl}`);
    }

    return <div className={
        clsx("inline-block align-bottom bg-white rounded-lg",
            "px-4 pt-5 pb-4 sm:p-6",
            "text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full ")}>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h1 className="mt-3 text-center text-2xl font-extrabold text-gray-900 ">
                <span>Login with a Bluesky OAuth</span>
            </h1>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        @Handle (user.bsky.social), did, or PDS URL (e.g. https://bsky.social)
                    </label>
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
                        type="submit"
                        className={
                            clsx("w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2",
                                "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500")
                        }>
                        Continue
                    </button>
                </div>
            </form>
        </div>

    </div>
}