import InputMultiWord from "features/input/InputMultiWord";
import clsx from "clsx";

export default function InputUserFilter({labelText, className, fieldName, watchSync, deduplicateArr, useFormReturn, check, syncClick}) {
    const {getValues} = useFormReturn;
    return  <InputMultiWord
        className={clsx("border-2 border-black p-2 rounded-xl", className)}
        labelText={labelText}
        placeHolder="handle.domain or did:plc:xxxxxxxxxxxxxxxxxxxxxxxx or list bsky.app/profile/.../lists/..."
        fieldName={fieldName}
        inputHidden={watchSync}
        disabled={watchSync}
        handleItem={(item, value, onChange) => {
            if (Array.isArray(item)) {
                for (const itm of item) {
                    let add = true;
                    for (const l of deduplicateArr) {
                        const ll = getValues(l) || [];
                        if (ll.find(x => x.did === itm.did)) {
                            add = false;
                            break;
                        }
                    }

                    if (add) {
                        value.push(itm);
                    }
                }
            } else {
                value.push(item);
            }

            value.sort((a, b) => {
                return a.handle.localeCompare(b.handle);
            });
            onChange(value);
        }}
        valueModifier={item => {
            return `${item.displayName} @${item.handle}`
        }}
        useFormReturn={useFormReturn}
        check={check(fieldName, [fieldName], true)}>
        <button
            type="button"
            className="bg-gray-100 border-black p-1 rounded-xl flex place-items-center gap-2 text-sm"
            onClick={syncClick}>
            <div className="font-semibold">Sync with List { !watchSync && "Instead" }</div>
            {
                watchSync && <div className="ml-2">
                    {`https://bsky.app/profile/${watchSync}`}
                </div>
            }
        </button>
    </InputMultiWord>
}