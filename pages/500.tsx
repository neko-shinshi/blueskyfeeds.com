import ErrorCode from "features/error/ErrorCode";
import {useRouter} from "next/router";
import HeadExtended from "features/layout/HeadExtended";
import {getLoggedInInfo} from "features/network/session";
import { MainWrapper } from "features/layout/MainWrapper";

export async function getServerSideProps({req, res, query}) {
    const {error, userData} = await getLoggedInInfo(req, res);
    if (error && error !== 500) { return {redirect: `/${error}`, permanent:false}; }

    return {props: {userData}};
}

export default function Example({userData}) {
    const router = useRouter();
    return <MainWrapper userData={userData}>
        <HeadExtended
            title="Internal Server Error"
            description="Something went wrong. Try again later"/>
        <ErrorCode title="500"
                   text1="Internal Server Error"
                   text2="Something went wrong. Try again later"
                   btnText="Go Back"
                   btnOnClick={() => {
                       router.back();
                   }}
                   href={undefined}/>
    </MainWrapper>
}