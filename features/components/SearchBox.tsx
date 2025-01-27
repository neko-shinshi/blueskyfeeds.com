import {useEffect, useRef} from "react";
import {urlWithParams} from "features/network/network";
import {useRouter} from "next/router";

export default function SearchBox ({path, title, busy, setBusy}:{path:string, title:string, busy:boolean, setBusy:any}) {
    const router = useRouter();
    const searchTextRef = useRef(null);
    const startSearch = async () => {
        if (busy) { return; }
        setBusy(true);
        const q = searchTextRef.current.value;
        if (!q.trim()) {
            await router.push(path);
            return;
        }
        setTimeout(() => setBusy(false), 1000); // delay a bit before removing loading popup
        await router.push(urlWithParams(path, {q}));
    }

    useEffect(() => {
        const {q} = router.query;
        if (q) {
            searchTextRef.current.value = q;
        }
    }, [router]);


    return <div className="bg-white border-2 border-black p-2 rounded-xl">
        <div className="font-bold">{title}</div>
        <div className="flex place-items-center gap-2 bg-sky-200 w-fit p-2 rounded-xl">
            <div className="flex">
                <input ref={searchTextRef} className="rounded-l-md p-1" type="text" onKeyDown={async (event) => {
                    if (event.key === "Enter") {
                        await startSearch();
                    }
                }}/>
                <button
                    type="button"
                    className={"relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"}
                    onClick={startSearch}
                >
                    <span>Search</span>
                </button>
            </div>
        </div>
    </div>
}