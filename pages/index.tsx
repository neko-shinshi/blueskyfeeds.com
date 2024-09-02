import ErrorCode from "features/error/ErrorCode";
import HeadExtended from "features/layout/HeadExtended";
import {useRouter} from "next/router";

export default function Example() {
    return (
        <>
            <HeadExtended
                title="Upgrading"
                description="Upgrading"/>
            <ErrorCode title="Upgrading Feed Infrastructure"
                       text1="Sorry for the inconvenience"
                       text2="Due to the overwhelming amount of data with the influx of users, this feed provider will be down for a few days to upgrade"
                       btnText="" btnOnClick={undefined} href=""            />

        </>
    )
}