import clsx from "clsx";
import {BiArrowFromBottom, BiArrowFromTop} from "react-icons/bi";
import {setNavbarPosCookie} from "features/utils/cookieUtils";

export default function NavButtonNavReposition({position, setPosition}) {
    return (
        <button className={clsx("inline-block h-8 w-8 rounded-md overflow-hidden",
            "text-white hover:bg-gray-700")}
                aria-label={`Move navigation bar to ${position == "top" ? "bottom" : "top"}`}
                onClick={() => {
                    const newPos = position == "top" ? "bottom" : "top";
                    setNavbarPosCookie(newPos);
                    setPosition(newPos);
                }}>
            {
                position == "top"? <BiArrowFromTop className="w-8 h-8"/> : <BiArrowFromBottom className="w-8 h-8"/>
            }
        </button>
    );
}
