import ErrorCode from "features/error/ErrorCode";
import {useRouter} from "next/router";
import HeadExtended from "features/layout/HeadExtended";

export default function Example() {
    const router = useRouter();
    return (
        <>
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
        </>
    )
}