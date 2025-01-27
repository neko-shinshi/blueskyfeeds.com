import {useState} from "react";

export default function TagCloud({tags}:{tags:{ tag:string, count: number}[]}) {
    const [showAllTags, setShowAllTags] = useState(false);

    return <> {
        tags.length > 0 && <div className="border-black bg-white p-2 rounded-xl w-full">
            <div className="flex place-items-center p-2 gap-2">
                <div>Feed Tags</div>
                <div className="p-0.5 bg-gray-300 hover:bg-gray-100 rounded-xl"
                     onClick={() => setShowAllTags(!showAllTags)}>Show All
                </div>
            </div>
            <div className="flex flex-wrap gap-1">
                {
                    tags.filter(x => showAllTags || x.count > 3).map(({tag, count}) => <a key={tag} href={`/tag/${tag}`}>
                        <div className="bg-gray-300 hover:bg-gray-100 rounded-md p-0.5">
                            {`${tag} (${count})`}
                        </div>
                    </a>)
                }
            </div>
        </div>
    } </>
}