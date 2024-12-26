import { Disclosure } from '@headlessui/react'
import NavButtonUserAvatar from "./NavButtonUserAvatar";
import clsx from "clsx";
import {useEffect, useRef, useState} from "react";
import NavLogo from "features/layout/NavLogo";
import NavButtonNavReposition from "features/layout/NavButtonNavReposition";
import {getNavbarPosCookie, getUserData} from "features/utils/cookieUtils";
import {useRouter} from "next/router";
import {useWidth} from "features/provider/WidthProvider";




export default function Navbar({hide}) {
    const [navPosition, setNavPosition] = useState<"top" | "bottom">("top");
    const router = useRouter();
    let scrollTs = 0;
    const [isScrolling, setIsScrolling] = useState(false);
    const width = useWidth();
    const closeRef = useRef(null);
    const closeDisclosurePanel = () => {
        if (closeRef.current) {closeRef.current();}
    }

    // Close Panel when changing mode
    useEffect(() => {
        if (width >= 768) { closeDisclosurePanel(); }
    }, [width]);

    useEffect(() => {
        window.addEventListener("scroll",function(){
            scrollTs = +new Date();
        });

        setInterval(() => {
            setIsScrolling(+new Date() < scrollTs + 400);
        }, 200);

        setNavPosition(getNavbarPosCookie());

        // Close panel when new
        router.events.on('routeChangeStart', closeDisclosurePanel)
        return () => {
            router.events.off('routeChangeStart', closeDisclosurePanel)
        }
    }, []);

    return (
        <>
            <div className={clsx(hide && "hidden",
                "bg-sky-700 z-20 transition-opacity",
                isScrolling? "opacity-0" : "opacity-100",
                navPosition == "top" ? "fixed w-full top-0" : "fixed inset-x-0 bottom-0"
            )}>
                { /* Background */ }
                <div className="inset-0 shadow pointer-events-none" aria-hidden="true"/>

                <Disclosure as="nav" className="relative">
                    {({ open: menuOpen, close: menuClose }) => (
                        <>
                            {/* Navbar Content */}
                            <div
                                ref={(el) => {
                                    closeRef.current = menuClose;
                                }}
                                className={clsx(
                                "max-w-7xl mx-auto flex justify-between items-center",
                                "pr-4 sm:pr-6 lg:pr-8 pl-2 sm:pl-4 lg:pl-4 h-10",
                                "md:justify-start md:space-x-10")}>
                                {/* Left */}

                                <NavLogo href={`/`}/>

                                {/* Mobile Right */}
                                <div className="-mr-2 -my-2 space-x-4 flex md:hidden">

                                    <NavButtonNavReposition position={navPosition}
                                                            setPosition={setNavPosition}/>
                                    <NavButtonUserAvatar navPosition={navPosition}/>
                                </div>

                                <div className="hidden md:flex-1 md:flex md:items-center md:justify-between">
                                    {/* Center */}
                                    <div className="w-full flex justify-between gap-2">

                                    </div>


                                    {/* Desktop Right */}
                                    <div className="flex items-center md:ml-12 space-x-4">
                                        <NavButtonNavReposition position={navPosition} setPosition={setNavPosition}/>
                                        <NavButtonUserAvatar navPosition={navPosition}/>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </Disclosure>
            </div>
            <div className={clsx(hide && "hidden", "flex justify-center z-20 top-0")}>
                <div className="w-full max-w-7xl bg-blue-400">
                    <div className="h-10 pl-2 sm:pl-4 lg:pl-4">
                        <NavLogo href={`/`}/>
                    </div>
                </div>
            </div>
        </>
    )
}