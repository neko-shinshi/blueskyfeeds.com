import clsx from "clsx";
import {HiChevronDown, HiChevronUp, HiMinus} from "react-icons/hi";

export default function ListControlButtons(
    {
        arrayIndex:i,
        canMoveUp,
        canMoveDown,
        moveUp,
        moveDown,
        remove,
    }:{
        arrayIndex: number
        canMoveUp: (number) => boolean,
        canMoveDown: (number) => boolean,
        moveUp:  (number) => void,
        moveDown: (number) => void,
        remove: (number) => void,
    }) {

    return <div className="relative z-0 inline-flex space-x-2">
        <button
            type="button"
            className={clsx(!canMoveUp(i)? "cursor-not-allowed": "", "relative inline-flex items-center p-1 rounded-md border-gray-300 bg-white disabled:bg-gray-300 text-sm font-medium text-FH-T4 hover:text-white hover:bg-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 focus:ring-offset-2")}
            onClick={() => {
                moveUp(i);
            }}
            disabled={!canMoveUp(i)}
        >
            <span className="sr-only">Up</span>
            <HiChevronUp className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
        </button>
        <button
            type="button"
            className={clsx(!canMoveDown(i)? "cursor-not-allowed": "", "-ml-px relative inline-flex items-center p-1 rounded-md border-gray-300 bg-white disabled:bg-gray-300 text-sm font-medium text-FH-T4 hover:text-white hover:bg-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 focus:ring-offset-2")}
            onClick={() => {
                moveDown(i);
            }}
            disabled={!canMoveDown(i)}
        >
            <span className="sr-only">Down</span>
            <HiChevronDown className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
        </button>
        <button
            type="button"
            className="-ml-px relative inline-flex items-center p-1 rounded-md border-gray-300 bg-white disabled:bg-gray-300 text-sm font-medium text-FH-T4 hover:text-white hover:bg-gray-900 focus:z-10 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 focus:ring-offset-2"
            onClick={() => remove(i)}
        >
            <span className="sr-only">Remove</span>
            <HiMinus className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
        </button>
    </div>
}