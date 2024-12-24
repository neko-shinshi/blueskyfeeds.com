import {Dialog, DialogBackdrop, DialogPanel} from "@headlessui/react";
import {useEffect} from 'react'
import {useRouter} from "next/router";
import clsx from "clsx";
export default function Popup(
    {
        children,
        className="",
        isOpen,
        setOpen,
        preventManualEscape=false,
        onCloseCallback,
    }:{
        children:any,
        className?:string,
        isOpen:boolean,
        setOpen:(boolean) => void,
        preventManualEscape?:boolean,
        onCloseCallback?: () => void
    }) {
    const router = useRouter();
    useEffect(() => {
        setOpen(false);
    }, [router]);

    return <Dialog className="fixed inset-0 overflow-y-auto z-[998]"
                   open={isOpen}
                   onClose={() => {
                       if (!preventManualEscape) {
                           setOpen(false);
                       }
                       if (onCloseCallback) {
                           onCloseCallback();
                       }
                   }}
    >

        <DialogBackdrop transition className={clsx("fixed inset-0 bg-black bg-opacity-75 transition duration-200",
            "data-[closed]:opacity-0",
            "data-[enter]:ease-out data-[enter]:opacity-100",
            "data-[leave]:ease-in")}/>


        <div className="fixed inset-0 overflow-y-auto">
            <div className="min-h-full grid place-items-center pt-8 pb-8 pl-16 pr-16">

                <DialogPanel transition className={clsx(className, "transition",
                    "data-[closed]:opacity-0 data-[closed]:translate-y-4",
                    "data-[enter]:duration-300 data-[enter]:ease-out data-[enter]:translate-y-0",
                    "data-[leave]:duration-200 data-[leave]:ease-in data-[leave]:translate-y-0"
                )}>
                    { children }
                </DialogPanel>
            </div>
        </div>
    </Dialog>
}