import {useEffect} from "react";
import HeadExtended from "features/layout/HeadExtended";
import PageHeader from "features/components/PageHeader";
import {signOut} from "next-auth/react";

export default function Home({}) {
    const title = "BlueskyFeeds.com";
    const description = "Signing out of your account";

    useEffect(() => {
        signOut({callbackUrl:"/"});
    }, []);
    return <>
        <HeadExtended title={title}
                      description={description}/>
        <div className="bg-sky-200 w-full max-w-8xl rounded-xl overflow-hidden p-4 space-y-4">
            <PageHeader title={title} description={description}/>

            <div>Signing out... Please wait...</div>
        </div>
    </>
}
