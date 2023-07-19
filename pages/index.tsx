import HeadExtended from "features/layout/HeadExtended";
import {useEffect, useRef, useState} from "react";
import Link from "next/link";
import {SiBuzzfeed} from "react-icons/si";
import PageHeader from "features/components/PageHeader";
import {getMyFeedIds} from "features/utils/feedUtils";
import {localDelete, urlWithParams} from "features/network/network";
import PopupConfirmation from "features/components/PopupConfirmation";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import FeedItem from "features/components/specific/FeedItem";
import {useRouter} from "next/router";
import {signIn, useSession} from "next-auth/react";
import {getLoggedInData} from "features/network/session";
import {APP_SESSION} from "features/auth/authUtils";

export async function getServerSideProps({req, res, query}) {
    const {updateSession, session, agent, redirect, db} = await getLoggedInData(req, res);
    if (redirect) {return {redirect};}

    const PAGE_SIZE = 20;
    let {t, q, p} = query;
    let $search, $skip;
    if (p) {
        $skip = parseInt(p) * PAGE_SIZE;
        if (isNaN($skip)) {
            return { redirect: { destination: '/400', permanent: false } };
        }
    }

    if (q) {
        let path = ["description", "displayName"];
        if (t === "name") {
            path = ["creator.handle", "creator.displayName"];
        }
        q = q.split("");
        q = q.reduce((acc, x) => {
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
        q = [...q.arr, q.carry].filter(x => x.length > 0).map(x => x.join(""));
        let {o, x} = q.reduce((acc, y) => {
            if (y.startsWith("-")) {
                acc.x.push(y.slice(1));
            } else {
                acc.o.push(y);
            }
            return acc;
        }, {o:[], x:[]});
        $search = {
            index: "all-feed-search",
            compound: {
                must: o.map(query => {
                    return {phrase: {query, path}};
                }),
                mustNot: x.map(query => {
                    return {phrase: {query, path}};
                })
            }
        };
    }

    const agg = [
        $search && {$search},
        { $sort : { likeCount:-1, indexedAt:1 } },
        $skip && { $skip },
        { $limit: PAGE_SIZE },
        {
            $project: {
                _id: 0, uri: "$_id",
                cid:1, did:1, creator:1, avatar:1,
                displayName:1, description:1, likeCount:1, indexedAt:1
            },
        },
    ].filter(x => x);
    const feeds = await db.allFeeds.aggregate(agg).toArray();
    let myFeeds = [];

    if (agent) {
        myFeeds = await getMyFeedIds(agent);
    }


    return {props: {updateSession, session, myFeeds, feeds}};
}


export default function Home({updateSession, feeds, myFeeds}) {
    const title = "BlueskyFeeds.com";
    const description = "Find your perfect feed algorithm for Bluesky Social App, or build one yourself";
    const [popupState, setPopupState] = useState<"delete"|false>(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [searchUser, setSearchUser] = useState(false);
    const recaptcha = useRecaptcha();
    const router = useRouter();
    const {data:session, status} = useSession();
    const searchTextRef = useRef(null);
    const startSearch = async () => {
        const q = searchTextRef.current.value;
        if (!q.trim()) { await router.push("/"); return;}
        let params:any = {q};
        if (searchUser) {
            params.t = "name";
        }
        await router.push(urlWithParams("/", params));
    }

    useEffect(() => {
        const {t, q} = router.query;
        if (t) {
            setSearchUser(t === "name");
        }
        if (q) {
            searchTextRef.current.value = q;
        }
    }, [router]);

    useEffect(() => {
        console.log("status", status);
        if (session && status === "authenticated" && updateSession) {
            signIn(APP_SESSION, {redirect: false, id: session.user.sk}).then(r => {
                console.log(r);
            });
        }
    }, [status]);

    return (
        <>
            <HeadExtended title={title}
                          description={description}/>
            <PopupConfirmation
                isOpen={popupState === "delete"}
                setOpen={setPopupState}
                title={`Confirm deletion of ${selectedItem?.displayName}`}
                message="This cannot be reversed"
                yesCallback={async() => {
                    if (typeof recaptcha !== 'undefined' && !busy) {
                        recaptcha.ready(async () => {
                            setBusy(true);
                            //@ts-ignore
                            const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                            const result = await localDelete("/feed/delete", {captcha, rkey: selectedItem.uri.split("/").slice(-1)[0]});
                            if (result.status === 200) {
                                router.reload();
                            } else {
                                console.log(result);
                            }
                            setBusy(false);
                        });
                    }
                }
                }/>
            <div className="bg-sky-200 w-full max-w-7xl rounded-xl overflow-hidden p-4 space-y-4">
                <PageHeader title={title} description={description} />

                <Link href="/my-feeds">
                    <button type="button"
                            className="mt-4 gap-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent  rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <SiBuzzfeed className="w-6 h-6"/>
                        <div className="text-lg font-medium">{session? "Manage your feeds" : "Login to create and manage your Feeds"}</div>
                        <SiBuzzfeed className="w-6 h-6"/>
                    </button>
                </Link>

                <div className="bg-white border border-black border-2 p-4 rounded-xl space-y-2">
                    <div className="text-lg font-medium">Existing Feeds</div>

                    <div className="flex place-items-center gap-2 bg-sky-200 w-fit p-2 rounded-xl">
                        <div className="flex">
                            <input ref={searchTextRef} className="rounded-l-md p-1" type="text" onKeyDown={async (event)  => {
                                if (event.key === "Enter") {
                                    await startSearch();
                                }
                            }} />
                            <button
                                type="button"
                                className={"relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"}
                                onClick={() => startSearch}
                            >
                            <span>Search</span>
                            </button>
                        </div>
                        <div className="flex place-items-center gap-1 p-1 hover:bg-orange-100 select-none" onClick={()=> setSearchUser(!searchUser)}>
                            <input type="checkbox" checked={searchUser} onChange={() => {}} onKeyDown={async e => {if (e.key === "Enter") {await startSearch()}}}/>Search User
                        </div>
                    </div>

                    {
                        feeds.map(x =>
                            <FeedItem key={x.uri} item={x} setSelectedItem={setSelectedItem} setPopupState={setPopupState} />
                        )
                    }
                </div>
            </div>
        </>
    )
}
