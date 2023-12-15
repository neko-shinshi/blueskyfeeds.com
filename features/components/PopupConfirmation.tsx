import React from "react";
import { Dialog } from '@headlessui/react'
import clsx from "clsx";
import Popup from "features/components/Popup";

export default function PopupConfirmation(
    {
        isOpen,
        setOpen,
        title,
        message,
        yesText,
        noText,
        yesCallback,
        buttonClass=""
    }: {
        isOpen:boolean
        setOpen:(boolean) => void,
        title:string,
        message:string,
        yesText?:string,
        noText?:string,
        yesCallback: () => void,
        buttonClass?:string
    }) {



    return <Popup isOpen={isOpen}
               setOpen={open => {
                   setOpen(open);
               }}
               preventManualEscape={false}
               onCloseCallback={undefined}>
        <div className="bg-white rounded-xl p-4">
            <div className="mt-3 text-center sm:mt-5">
                <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                    {title}
                </Dialog.Title>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        {message}
                    </p>
                </div>
            </div>
            <div className="mt-5 flex justify-between space-x-4">
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border-2 border-black shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => setOpen(false)}
                >
                    {noText? noText:"Cancel"}
                </button>
                <button
                    type="button"
                    className={clsx(buttonClass || "bg-white hover:text-white",
                        "mt-3 w-full inline-flex justify-center rounded-md border-2 shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:mt-0 sm:col-start-1 sm:text-sm")}
                    onClick={() => {
                        setOpen(false);
                        if (yesCallback) {
                            yesCallback();
                        }
                    }}
                >
                    {yesText? yesText:"Ok"}
                </button>
            </div>
        </div>


     </Popup>
}
