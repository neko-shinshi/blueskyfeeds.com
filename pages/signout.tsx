import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import PageFooter from "features/components/PageFooter";
import {MainWrapper} from "features/layout/MainWrapper";
import {getLoggedInInfo} from "features/network/session";
import {getDbClient} from "features/utils/db";
import {deleteCookie} from "cookies-next";
export async function getServerSideProps({req, res, query}) {
    deleteCookie("sk", {req, res});

    return {props: {}};
}
export default function Home({}) {
    const title = "BlueskyFeeds.com";
    const description = "Account signed out";

    return  <MainWrapper userData={null}>
        <HeadExtended title={title}
                      description={description}/>
        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>

            <div className="text-center text-2xl bg-white p-4 border-2 border-black">You have been signed out</div>
            <PageFooter/>
        </div>
    </MainWrapper>
}
