import clsx from "clsx";

export default function ItemConfig({title, items}) {
    return <div className="bg-sky-100 p-2 space-y-2">
        <div className="font-semibold">{title}</div>
        <div className="grid md:grid-cols-2 gap-2">
            {
                items.map(x =>
                    <div key={x.id}
                         className="flex place-items-center bg-orange-100 hover:bg-gray-50 gap-2 p-1"
                         onClick={() => {
                             let newValue;
                             if (items.indexOf(x.id) >= 0) {
                                 newValue = [...items.filter(y => y !== x.id)];
                             } else {
                                 newValue = [...items, x.id];
                             }
                             setPics(newValue);
                             if (newValue.indexOf("text") < 0) {
                                 setValue("mustLabels", []);
                             }
                         }}>
                        <input type="checkbox"
                               onChange={() => {
                               }}
                               onClick={(e) => {
                                   e.stopPropagation();
                                   if (items.indexOf(x.id) >= 0) {
                                       setPics([...pics.filter(y => y !== x.id)]);
                                   } else {
                                       setPics([...pics, x.id]);
                                   }
                               }}
                               checked={items.indexOf(x.id) >= 0}
                               className={clsx("focus:ring-indigo-500 h-6 w-6 rounded-lg")}
                        />
                        <div>{x.txt}</div>
                    </div>)
            }
        </div>
        {
            items.length === 0 && <div className="text-red-700">Please select at least one post type above</div>
        }
    </div>
}