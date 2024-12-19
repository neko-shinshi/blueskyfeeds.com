import ErrorCode from "features/error/ErrorCode";
import HeadExtended from "features/layout/HeadExtended";
import {useRouter} from "next/router";
import {getLoggedInInfo} from "features/network/session";
import {MainWrapper} from "features/layout/MainWrapper";

export async function getServerSideProps({req, res, query}) {
    const {error, userData} = await getLoggedInInfo(req, res);
    if (error && error !== 401) { return {redirect: `/${error}`, permanent:false}; }

    return {props: {userData}};
}

export default function Example({userData}) {
    const router = useRouter();
    return <MainWrapper userData={userData}>
        <HeadExtended
            title="Unauthorized"
            description="You are not allowed to access this page"/>
        <ErrorCode title="401"
                   text1="Unauthorized"
                   text2="You are not allowed to access this page"
                   btnText="Go Back"
                   btnOnClick={() => {
                       router.back();
                   }}
                   href={undefined}/>

    </MainWrapper>
}