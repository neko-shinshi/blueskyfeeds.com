import {HiArrowLongLeft, HiArrowLongRight} from "react-icons/hi2";
import Link from "next/link";
import clsx from "clsx";
import { paramsToEncodedString } from "features/network/network";

export default function BackAndForwardButtons({basePath, params}) {

    const getCurrentPage = () => {
        return params.p? parseInt(params.p) : 1;
    }

    return <nav className="flex items-center justify-between px-4 sm:px-0 mt-4 ">
            <div className={clsx(
                getCurrentPage() === 1 && "invisible",
                "-mt-px flex w-0 flex-1")}>
                <Link
                    href={`${basePath}${paramsToEncodedString({...params, p: getCurrentPage()-1})}`}
                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pr-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                    <HiArrowLongLeft className="mr-3 h-5 w-5 text-gray-400" />
                    Previous
                </Link>
            </div>

            <div className={
                clsx("-mt-px flex w-0 flex-1 justify-end")
            }>
                <Link
                    href={`${basePath}${paramsToEncodedString({...params, p: getCurrentPage()+1})}`}
                    className="bg-sky-100 rounded-xl inline-flex items-center border-2 border-transparent p-3 pl-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                    Next
                    <HiArrowLongRight className="ml-3 h-5 w-5 text-gray-400" />
                </Link>
            </div>
        </nav>
}