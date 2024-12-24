import React, {useRef, useState} from "react";
import { Dialog } from '@headlessui/react'
import clsx from "clsx";
import Popup from "features/components/Popup";

export default function PopupWithInputText(
    {
        isOpen,
        setOpen,
        title,
        message,
        yesText="Update",
        validateCallback,
        yesCallback,
        placeholder="",
        buttonClass="",
        inputClass="",
        popupClass="",
        busy,
        children
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        yesText?:string,
        validateCallback: (string) => string,
        yesCallback: (v:string, callback:any) => void,
        placeholder?:string,
        buttonClass?:string,
        inputClass?:string,
        popupClass?:string,
        busy:boolean,
        children:any
    }) {

    const ref = useRef(null);
    const [errorText, setErrorText] = useState("");

    return <Popup isOpen={isOpen}
                  setOpen={open => {
                      setOpen(open);
                  }}
                  preventManualEscape={busy}
                  onCloseCallback={undefined}>
        <div className={clsx("bg-white rounded-xl p-4", popupClass)}>
            <div className="text-center space-y-4">
                <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    {title}
                </Dialog.Title>
                {
                    message &&  <div className="">
                        <p className="text-sm text-gray-500">
                            {message}
                        </p>
                    </div>
                }

                <input placeholder={placeholder} ref={ref} className={clsx("w-full rounded-xl", inputClass)} type="text"
                       onKeyDown={async (e) => {
                           if (e.key === "Enter") {
                               yesCallback(ref.current.value, (error) => {
                                   if (error) {
                                       setErrorText(error);
                                   } else {
                                       setErrorText("");
                                       setOpen(false);
                                   }
                               });
                           }
                       }}
                       onChange={() => {
                           const error = validateCallback(ref.current.value);
                           if (error) {
                               setErrorText(error);
                           } else {
                               setErrorText("");
                           }
                       }}/>
                {
                    errorText &&
                    <p className="mt-2 text-sm text-red-600">
                        {errorText}
                    </p>
                }
            </div>
            <div className="mt-5 w-full justify-between space-x-4">
                <button
                    disabled={busy || !!errorText}
                    type="button"
                    className={clsx(buttonClass || "bg-white hover:text-white hover:bg-violet-700 disabled:bg-gray-400",
                        "mt-3 w-full inline-flex justify-center rounded-md border-2 shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm")}
                    onClick={() => {
                        yesCallback(ref.current.value, (error) => {
                            if (error) {
                                setErrorText(error);
                            } else {
                                setErrorText("");
                                setOpen(false);
                            }
                        });
                    }}
                >
                    {yesText}
                    {
                        busy && <div role="status" className="ml-2">
                            <svg aria-hidden="true"
                                 className="inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                                 viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                    fill="currentColor"/>
                                <path
                                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                    fill="currentFill"/>
                            </svg>
                            <span className="sr-only">Loading...</span>
                        </div>
                    }
                </button>
            </div>
        </div>
        {children}
    </Popup>
}
