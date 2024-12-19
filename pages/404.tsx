import ErrorCode from "features/error/ErrorCode";
import HeadExtended from "features/layout/HeadExtended";
import {useRouter} from "next/router";
import {MainWrapper} from "features/layout/MainWrapper";


export default function Example({userData}) {
    const router = useRouter();
    return <MainWrapper userData={userData}>
        <HeadExtended
            title="Page Not Found"
            description="This page does not exist"/>
        <ErrorCode title="404"
                   text1="Page not found"
                   text2="This page does not exist. Please update the URL in the address bar before trying again"
                   btnText="Go Back"
                   btnOnClick={() => {
                       router.back();
                   }}
                   href={undefined}/>

    </MainWrapper>
}