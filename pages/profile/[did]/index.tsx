import {getLoggedInInfo} from "features/network/session";
import {getDbClient} from "features/utils/db";
import {useEffect, useState} from "react";
import {useUserData} from "features/provider/UserDataProvider";
import {useRouter} from "next/router";
import HeadExtended from "features/layout/HeadExtended";
import PopupLoading from "features/components/PopupLoading";
import {MainWrapper} from "features/layout/MainWrapper";

export async function getServerSideProps({req, res, query}) {
    const [{ error, privateAgent}, dbUtils] = await Promise.all([
        getLoggedInInfo(req, res),
        getDbClient()
    ]);

}

export default function Home({feeds:_feeds, user}) {
    const title = `Feeds by ${}`;
    const description = "Find your perfect feed algorithm for Bluesky Social App, or build one yourself";
    const [popupState, setPopupState] = useState<"delete" | false>(false);
    const [busy, setBusy] = useState<boolean>(false);
    const [feeds, setFeeds] = useState(_feeds);
    useEffect(() => {
        setFeeds(_feeds);
    }, [_feeds]);

    function refreshFeeds() {
        setFeeds([...feeds]);
    }


    const router = useRouter();
    return <MainWrapper>
        <HeadExtended title={title} description={description}/>
        <PopupLoading isOpen={busy}/>

    </MainWrapper>
}