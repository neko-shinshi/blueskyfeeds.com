import Popup from "features/components/Popup";
import {useState} from "react";
import {useWidth} from "features/layout/WidthProvider";

export default function PopupAddKeyword ({isOpen, setOpen, keywords, busy, setBusy}) {
    const [mode, setMode] = useState<"t"|"s"|"#"|"">("");
    return <Popup isOpen={isOpen} setOpen={setOpen} className="bg-white border-2 rounded-2xl p-4">
        <div>There are three ways keywords are filtered, select one of the
            <span className="text-pink-600 ml-1">different</span>
            <span className="text-yellow-600 ml-1">colored</span>
            <span className="text-sky-600 ml-1 mr-1">tabs</span>
            below to continue</div>
        <div className="lg:grid lg:grid-cols-3">
            <div className="bg-pink-200">
                <div className="text-center">Word Token</div>
                <ul className="list-disc pl-4">
                    <li><span className="font-bold">Does not work for non-latin languages</span> like Korean, Mandarin
                        or Japanese, use <span className="font-bold underline">Segment</span> Mode instead
                    </li>
                    <li>In token mode, posts and search terms are set to lowercase, then split into individual words
                        (tokens) by splitting them by non latin characters (i.e. spaces, symbols, 言, ل) e.g. `this is
                        un-funny.jpg` becomes `this` `is` `un `funny` `jpg`
                    </li>
                    <li>The search term is searched both separately and together, e.g. `quick draw` will also find `quickdraw` and `#quickdraw`
                    </li>
                    <li>`quick draw` will not find `quick` or `draw` alone. If you want that, add `quick` and `draw` as
                        separate keywords
                    </li>
                    <li>Works for terms with accents like `bon appétit`</li>
                    <li>Might not work well if the term is combined with other terms, e.g. searching for `cat` will not
                        find `caturday`, search for `caturday` separately or use Segment mode
                    </li>
                    <li>A desired token might often appear with undesired terms, like `one piece swimsuit` when looking
                        for the anime `one piece`
                    </li>
                    <li>To prevent this, use an ignore combination to add `swimsuit` to reject `one piece swimsuit` if
                        it appears but accept `one piece`
                    </li>
                </ul>
            </div>
            <div className="bg-yellow-200">
                <div className="text-center text-lg"><span>Segment</span><span className="ml-2">e.g. [cat]egory</span></div>
                <ul className="list-disc pl-4">
                    <li>Post text is searched character-by-character, but may accidentally find longer words that include
                        the search terms
                    </li>
                    <li>For example: `cat` is inside both `concatenation` and `cataclysm`</li>
                    <li>To prevent this, add the prefix and suffix of common terms to reject</li>
                    <li>This is the preferred way to search for non-latin words like アニメ</li>
                </ul>
            </div>
            <div className="bg-sky-200">
                <div className="text-center">#Hashtag</div>
                <ul className="list-disc pl-4">
                    <li>Post text is searched for hashtags included hidden hashtags</li>
                </ul>
            </div>
        </div>
    </Popup>
}