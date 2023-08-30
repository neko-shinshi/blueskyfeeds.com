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
        buttonClass=""
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        yesText?:string,
        validateCallback: (string) => string,
        yesCallback: (v:string, callback:any) => void,
        placeholder?:string,
        buttonClass?:string
    }) {

    const ref = useRef(null);
    const [errorText, setErrorText] = useState("");

    return <Popup isOpen={isOpen}
                  setOpen={open => {
                      setOpen(open);
                  }}
                  preventManualEscape={false}
                  onCloseCallback={undefined}>
        <div className="bg-white rounded-xl p-4">
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

                <input placeholder={placeholder} ref={ref} className="w-full" type="text"
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
                    type="button"
                    className={clsx(buttonClass || "bg-white hover:text-white hover:bg-violet-700",
                        "mt-3 w-full inline-flex justify-center rounded-md border border-2 shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm")}
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
                </button>
            </div>
        </div>


    </Popup>
}
