import {HiPlus} from "react-icons/hi";
import {useState} from "react";
import PopupAddPost from "features/components/input/elements/PopupAddPost";
import ListControlButtons from "features/components/ListControlButtons";


export default function PostsEdit ({useFormReturn, recaptcha, setBusy}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const {
        setValue,
        getValues,
        watch
    } = useFormReturn;
    const watchPosts = watch("posts");



    return <div className="bg-lime-100 p-2">
        <PopupAddPost
            isOpen={popupOpen}
            setOpen={setPopupOpen}
            title="Add Post"
            message="Copy whole or part of url from browser or share button. Use a comma-separated array for multiple posts e.g. with brackets [A,B,C]"
            recaptcha={recaptcha}
            setBusy={setBusy}
            limitOne={false}
            resultCallback={(posts, callback) => {
                if (Object.keys(posts).length > 0) {
                    let newPosts = getValues("posts") || [];
                    const addPosts = posts.filter(x => {
                        const {uri} = x;
                        return !newPosts.find(y => y.uri === uri);
                    });

                    if (addPosts.length === 0) {
                        callback("Duplicate posts, no new posts to add");
                    } else {
                        newPosts.push(...addPosts);
                        setValue("posts", newPosts);
                        callback();
                    }
                }
            }}/>
        <div className="space-y-4">
            <button
                type="button"
                className="relative -ml-px inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onClick={() => setPopupOpen(true)}
            >
                <div className="flex gap-2 place-items-center"><HiPlus className="w-4 h-4"/>Add Single Post or Multiple Posts with Comma-Separated Array</div>
            </button>


            {
                watchPosts && Array.isArray(watchPosts) && watchPosts.length > 0 && <div className="bg-orange-300 p-2 space-y-2 rounded-xl">
                    {
                        watchPosts.map((x,i) => {
                            const swapOrder = (x,y) => {
                                const p = getValues("posts");
                                const temp = p[x];
                                p[x] = p[y];
                                p[y] = temp;
                                setValue("posts", p);
                            }

                            return <div key={x.uri} className="">
                                <div className="bg-gray-200 p-1 flex justify-between">
                                    <div><span>{i+1}: </span>{x.uri}</div>
                                    <ListControlButtons
                                        arrayIndex={i}
                                        canMoveUp={_ => i !== 0}
                                        canMoveDown={_ => i < watchPosts.length - 1}
                                        moveUp={_ => swapOrder(i - 1, i)}
                                        moveDown={_ => swapOrder(i, i + 1)}
                                        remove={_ => {
                                            setValue("posts", getValues("posts").filter(y => y.uri !== x.uri));
                                        }} />
                                </div>
                                <div className="bg-white p-1">{x.text}</div>
                            </div>
                        })
                    }
                </div>
            }
        </div>

    </div>
}