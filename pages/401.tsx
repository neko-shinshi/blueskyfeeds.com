import ErrorCode from "features/error/ErrorCode";
import HeadExtended from "features/layout/HeadExtended";
import {useRouter} from "next/router";
import {MainWrapper} from "features/layout/MainWrapper";


export default function Example({}) {

    const router = useRouter();
    return <MainWrapper>
        <HeadExtended
            title="Unauthorized"
            description="You are not allowed to access this page or have been logged out"/>
        <ErrorCode title="401"
                   text1="Unauthorized"
                   text2="You are not allowed to access this page or have been logged out"
                   btnText="Go Back"
                   btnOnClick={() => {
                       router.back();
                   }}
                   href={undefined}/>

    </MainWrapper>
}