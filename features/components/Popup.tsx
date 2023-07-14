import {Dialog, Transition} from "@headlessui/react";
import {Fragment, useEffect} from 'react'
import {useRouter} from "next/router";
export default function Popup(
    {
        children,
        className="",
        isOpen,
        setOpen,
        preventManualEscape=false,
        onCloseCallback,
        initialFocus
    }:{
        children:any,
        className?:string,
        isOpen:boolean,
        setOpen:(boolean) => void,
        preventManualEscape?:boolean,
        onCloseCallback?: () => void
        initialFocus?:any
    }) {
    const router = useRouter();
    useEffect(() => {
        setOpen(false);
    }, [router]);

    return <Transition.Root show={isOpen} as={Fragment}>
        <Dialog className="fixed inset-0 overflow-y-auto z-[998]"
                initialFocus={initialFocus}
                onClose={() => {
                    if (!preventManualEscape) {
                        setOpen(false);
                    }
                    if (onCloseCallback) {
                        onCloseCallback();
                    }
                }}
        >
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="min-h-full grid place-items-center pt-8 pb-8 pl-16 pr-16">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >

                        <Dialog.Panel className={className}>
                            { children }
                        </Dialog.Panel>

                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition.Root>

}