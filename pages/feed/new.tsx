import {getLoggedInInfo} from "features/network/session";
import {respondPageErrors} from "features/utils/page";
import {useEffect, useState} from "react";
import {useRecaptcha} from "features/provider/RecaptchaProvider";
import {useRouter} from "next/router";
import {MainWrapper} from "features/layout/MainWrapper";
import {HiArrowLongLeft, HiArrowLongRight} from "react-icons/hi2";
import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import PageFooter from "features/components/PageFooter";
import DataManager from "features/components/input/DataManager";
import ItemPosts from "features/components/edit-feed/posts";
import ItemBsky from "features/components/edit-feed/bsky";
import {getCustomFeeds, isVIP} from "features/utils/bsky";
import Keywords from "features/components/input/Keywords";
import ItemUsers from "features/components/edit-feed/users";

export async function getServerSideProps({req, res, query}) {
    const {error, privateAgent} = await getLoggedInInfo(req, res);
    const redirect = respondPageErrors([{val:error, code:error}, {val:!privateAgent, code:401}]);
    if (redirect) { return redirect; }

    const myCreatedFeeds = await getCustomFeeds(privateAgent);
    const feedShortNames = myCreatedFeeds.map(x => x.uri.split("/").at(-1));

    const VIP = isVIP(privateAgent.did);

    return {props: {feedShortNames, VIP}}
}

type MODAL_TYPE = "root"|"list"|"keywords"|"posts"|"bsky";
type MODAL = {
    modal: MODAL_TYPE,
    data?: any,
    path?: string,
    optional?: true
}

const BackButton = ({index, setIndex, dataManager, stack}: {
    index: number,
    setIndex: any,
    dataManager: DataManager,
    stack: MODAL[]
}) => {
    return <button
        type="button"
        className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-black p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
        onClick={() => {
            console.log("pre", dataManager.dataSources);
            dataManager.validateHasError();
            stack[index].data = dataManager.pop();
            setIndex(index - 1);
            console.log("post", stack[index].data);
        }}
    >
        <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400"/>
        Back
    </button>
}

const ForwardButton = ({index, setIndex, override=false, dataManager, stack}:{index:number, setIndex:any, override?:any, dataManager:DataManager, stack:MODAL[]}) => {
    return <button
            type="button"
            className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-black p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
            onClick={() => {
                console.log("pre", dataManager.dataSources);
                if (dataManager.validateHasError()) {
                    alert("There is at least one error. Please resolve it to continue.")
                    return;
                }
                if (override) {override();}
                else {
                    if (index > 0) {
                        const data = dataManager.pop();
                        console.log(index, data);
                        stack[index].data = data;
                    }
                    setIndex(index + 1);
                }
                console.log("post", dataManager.dataSources);
            }}
        >
            Next
            <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400"/>
    </button>
}

const BackAndForwardButton = ({index, setIndex, dataManager, stack, override=false, children}:{index, setIndex, dataManager, stack, override?:any, children?:any}) => {
    return <div className="flex justify-between">
        <BackButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
        {children}
        <ForwardButton index={index} setIndex={setIndex} dataManager={dataManager}
                       stack={stack} override={override}/>
    </div>
}

const BackAndFowardButtonLast = ({index, setIndex, dataManager, stack, subtitle=""}) => {
    return <BackAndForwardButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack} override={() => {
        if (dataManager.validateHasError()) {
            alert("There is at least one error. Please fix it to continue.")
            return;
        }
        const data = stack.reduce((acc: any, x) => {
            if (x.data) {
                acc = {...acc, ...x.data};
            }
            return acc;
        }, dataManager.getAll());
        console.log(data);
    }}>
        {subtitle && <div className="flex items-center font-bold text-lg">{subtitle}</div>}
    </BackAndForwardButton>
}

const BackAndForwardButtonWithTitle = ({index, setIndex, dataManager, stack, subtitle}) => {
    return <BackAndForwardButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}>
        <div className="flex items-center font-bold text-lg">{subtitle}</div>
    </BackAndForwardButton>
}

export default function Home({feedShortNames, VIP}) {
    const title = "Make a new Feed BlueskyFeeds.com";
    const description = "Choose the type of feed to create";
    const [busy, setBusy] = useState(false);
    const [stack, setStack] = useState<MODAL[]>([{modal: "root"}]);
    const [index, setIndex] = useState<number>(0);
    const [subTitle, setSubtitle] = useState("");

    useEffect(() => {
        if (index > 0) {
            const o = stack[index].data;
            if (o) {
                for (const [k,v] of Object.entries(o)) {
                    const j = dataManager.dataSources.get(k);
                    if (j) {
                        const {set} = j;
                        if (Array.isArray(v)) {
                            set(Array.from(v));
                        } else {
                            set(v);
                        }

                    }
                }
            }

        }
    }, [index]);

    const dataManager = new DataManager();

    return <>
        <HeadExtended title={title} description={description}/>
        return <MainWrapper>
            <div className="space-y-4">
                <PageHeader title={title} description="" />

                <div className="bg-white p-4 space-y-4 rounded-2xl border-black border-2">
                    {
                        stack[index].modal === "root" &&
                        <>
                            <div className="font-bold text-xl">What kind of feed do you want to make?</div>
                            <div className="space-y-1">
                                <div
                                    className="w-full bg-blue-100 hover:bg-blue-400 p-4 border border-black rounded-lg"
                                    onClick={() => {
                                        setStack([{modal: "root"}, {modal: "keywords"}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "live");
                                        setSubtitle("Realtime Posts:");
                                    }}>
                                    <div className="font-bold text-lg">Realtime posts:</div>
                                    <div className="font-semibold">Feed lists the latest posts of a community or fandom</div>
                                    <ul className="list-disc ml-4">
                                        <li>By filtering incoming posts for #hashtags or keywords</li>
                                        <li>Posts are kept for at least 4 days</li>
                                        <li>{"E.g. Latest posts with #bluesky but no 'cats'"}</li>
                                    </ul>
                                </div>
                                <div
                                    className="w-full bg-blue-100 hover:bg-blue-400 p-4 border border-black rounded-lg"
                                    onClick={() => {
                                        setStack([{modal: "root"}, {modal: "list", path:"allowList"},
                                            {modal: "keywords", optional: true}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "live");
                                        setSubtitle("Realtime Posts from Specific users:");
                                    }}>
                                    <div className="font-bold text-lg">Realtime Posts from Specific users:</div>
                                    <div className="font-semibold">Feed lists only the latest posts by specified users</div>
                                    <ul className="list-disc ml-4">
                                        <li>By filtering incoming posts</li>
                                        <li>Can be further filtered for #hashtags or keywords</li>
                                        <li>Posts are kept for at least 4 days</li>
                                        <li>E.g. Latest posts by @blueskyfeeds.com </li>
                                    </ul>
                                </div>
                                <div
                                    className="w-full bg-yellow-100 hover:bg-yellow-400 p-4 border border-black rounded-lg"
                                    onClick={() => {
                                        setStack([{modal: "root"}, {modal: "list", path: "allowList"},
                                            {modal: "keywords", optional: true}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "user-posts");
                                        setSubtitle("All of Users' Posts:");
                                    }}>
                                    <div className="font-bold text-lg">{"All of Users' Posts:"}</div>
                                    <div className="font-semibold">Feed lists all posts by specific users</div>
                                    <ul className="list-disc ml-4">
                                        <li>New posts are added almost immediately</li>
                                        <li>Can be further filtered for #hashtags or keywords</li>
                                        <li>E.g. All my posts with #art</li>
                                    </ul>
                                </div>
                                <div
                                    className="w-full bg-lime-100 p-4 hover:bg-lime-400 border border-black rounded-lg"
                                    onClick={async () => {
                                        setStack([{modal: "root"}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "user-likes");
                                        setSubtitle("My Likes:");
                                    }}>
                                    <div className="font-bold text-lg">My Likes:</div>
                                    <div className="font-semibold">Feed of all your likes, latest at top</div>
                                </div>
                                <div
                                    className="w-full bg-lime-100 p-4 hover:bg-lime-400 border border-black rounded-lg"
                                    onClick={async () => {
                                        setStack([{modal: "root"}, {modal: "list", path:"allowList"}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "user-likes");
                                        setSubtitle("Users' Likes:");
                                    }}>
                                    <div className="font-bold text-lg">{"Users' Likes:"}</div>
                                    <div className="font-semibold">Feed lists only the realtime likes from specified users</div>
                                    <ul className="list-disc ml-4">
                                        <li>Only likes made after point of creation <span className="font-semibold">{"(it is difficult to query other users' old likes)"}</span>
                                        </li>
                                        <li>Only *your* old likes will be fully imported</li>
                                    </ul>
                                </div>

                                <div
                                    className="w-full bg-violet-100 p-4 hover:bg-violet-400 border border-black rounded-lg"
                                    onClick={() => {
                                        setStack([{modal: "root"}, {modal: "posts"}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "posts");
                                        setSubtitle("List of Posts:");
                                    }}>
                                    <div className="font-bold text-lg">List of Posts:</div>
                                    <div className="font-semibold">Feed is a list of posts</div>
                                    <ul className="list-disc ml-4">
                                        <li>E.g. How to use Bluesky in posts</li>
                                    </ul>
                                </div>

                                <div
                                    className="w-full bg-red-100 p-4 hover:bg-red-400 border border-black rounded-lg"
                                    onClick={() => {
                                        setStack([{modal: "root"}, {modal: "list", path:"everyList"}, {modal: "bsky"}]);
                                        setIndex(index + 1);
                                        dataManager.set("mode", "responses");
                                        setSubtitle("Responses to Accounts:");
                                    }}>
                                    <div className="font-bold text-lg">Responses to Accounts:</div>
                                    <div className="font-semibold">Feed lists the realtime responses to posts from specified users</div>
                                    <ul className="list-disc ml-4">
                                        <li>Only responses made after point of creation</li>
                                        <li>Replies to threads created by users</li>
                                        <li>Replies to posts made by users</li>
                                        <li>Posts that quote posts made by users</li>
                                        <li>Posts that @mention any of the users</li>
                                        <li>E.g. Monitoring posts involving but not made by the Bluesky Team</li>
                                    </ul>
                                </div>
                            </div>
                        </>

                    }
                    {
                        stack[index].modal === "posts" &&
                        <>
                            <BackAndForwardButtonWithTitle subtitle={subTitle} index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                            <div className="font-bold text-xl">Which posts do you want to show in the feed?</div>
                            <ItemPosts busy={busy} setBusy={setBusy} dataManager={dataManager} path="posts"
                                       minSize={1}/>
                            <BackAndForwardButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                        </>
                    }

                    {
                        stack[index].modal === "keywords" &&
                        <>
                            <BackAndForwardButtonWithTitle subtitle={subTitle} index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                            <div className="font-bold text-xl flex justify-between">
                                <div>Which keywords do you want use to filter the feed?</div>
                                    {stack[index].optional && <div>(Optional)</div>}
                            </div>
                            <Keywords
                                title="Block" busy={busy} setBusy={setBusy} VIP={VIP} dataManager={dataManager}
                                path="blockKeywords" minSize={0}
                                description={<div>A post with any of these keywords will be immediately <span
                                    className="font-semibold">rejected</span></div>}
                                className="bg-red-100"
                            />

                            <Keywords
                                title="Search" busy={busy} setBusy={setBusy} VIP={VIP} dataManager={dataManager}
                                path="keywords" minSize={!stack[index].optional && 1}
                                description={<div>A post <span
                                    className="font-semibold">must have at least one</span> of these keywords to enter
                                    the feed</div>}
                            />
                            <BackAndForwardButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                        </>
                    }

                    {
                        stack[index].modal === "list" &&
                        <>
                            <BackAndForwardButtonWithTitle subtitle={subTitle} index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                            <div className="font-bold text-xl">{"Which users' posts do you want to show?"}</div>
                            <ItemUsers busy={busy} setBusy={setBusy} dataManager={dataManager}
                                       basePath={stack[index].path} title="List Type"
                                       required={!stack[index].optional}/>
                            <BackAndForwardButton index={index} setIndex={setIndex} dataManager={dataManager} stack={stack}/>
                        </>
                    }
                    {
                        stack[index].modal === "bsky" && <>
                            <BackAndFowardButtonLast subtitle={subTitle} index={index} setIndex={setIndex} dataManager={dataManager} stack={stack} />
                            <div className="font-bold text-xl">{"Fill in your new feed's details"}</div>
                            <ItemBsky dataManager={dataManager} shortNameLocked={false} feedShortNames={feedShortNames}/>
                            <BackAndFowardButtonLast index={index} setIndex={setIndex} dataManager={dataManager} stack={stack} />
                        </>
                    }
                </div>
                <PageFooter/>
            </div>
        </MainWrapper>
    </>
}

