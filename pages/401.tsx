import ErrorCode from "features/error/ErrorCode";
import HeadExtended from "features/layout/HeadExtended";
import {useRouter} from "next/router";

export default function Example() {
    const router = useRouter();
    return (
        <>
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

        </>
    )
}