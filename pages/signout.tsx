import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import PageFooter from "features/components/PageFooter";
import {MainWrapper} from "features/layout/MainWrapper";
import {deleteCookie} from "cookies-next";
import {SESSION_KEY_ID, SESSION_MISC_ID, STATE_KEY_ID} from "features/utils/constants";
export async function getServerSideProps({req, res, query}) {
    console.log("DELETING", SESSION_MISC_ID, SESSION_KEY_ID, STATE_KEY_ID);
    deleteCookie(SESSION_MISC_ID, {req, res, domain: process.env.NEXT_PUBLIC_DOMAIN, path:"/"});
    deleteCookie(SESSION_KEY_ID, {req, res, domain: process.env.NEXT_PUBLIC_DOMAIN, path:"/"});
    deleteCookie(STATE_KEY_ID, {req, res, domain: process.env.NEXT_PUBLIC_DOMAIN, path:"/"});
    return {props: {}};
}
export default function Home({}) {
    const title = "BlueskyFeeds.com";
    const description = "Account signed out";

    return  <MainWrapper>
        <HeadExtended title={title}
                      description={description}/>
        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>

            <div className="text-center text-2xl bg-white p-4 border-2 border-black">You have been signed out</div>
            <PageFooter/>
        </div>
    </MainWrapper>
}
