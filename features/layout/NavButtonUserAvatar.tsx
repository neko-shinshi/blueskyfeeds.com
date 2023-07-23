import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import {HiLogout} from "react-icons/hi";
import {useRouter} from "next/router";
import {signOut, useSession} from "next-auth/react";
import {Fragment, useEffect, useState} from "react";
import PopupSignIn from "features/login/PopupSignIn";
import Image from "next/image";

export default function NavButtonUserAvatar({navPosition}) {
    const router = useRouter();
    const { data: session } = useSession();
    const [isOpen, setOpen] = useState(false);
    const logout = async () => {
        await signOut();
    }

    useEffect(() => {
        setOpen(false);
    }, [session, router]);

    return (
        <>
            {
                session &&
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                        className="inline-block justify-center h-8 w-8 rounded-full overflow-hidden bg-gray-500 shadow-inner ring-1 ring-white">
                        {
                            session.user.image ? <div className="relative h-8 w-8"><Image unoptimized fill src={session.user.image} alt="user-avatar"/></div> :
                                <span className="text-sm font-medium leading-none text-white select-none">
                                    {session.user.name.charAt(0)}
                                </span>
                        }
                    </Menu.Button>
                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Menu.Items className={clsx(
                            navPosition == "top" ? "origin-top-right right-0 mt-2" : "origin-bottom-right right-0 bottom-0 -translate-y-1/2",
                            "absolute w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none")}>

                            <Menu.Item>
                                {({active}) => (
                                    <button type="button"
                                        className={clsx(active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                            'block w-full text-left px-4 py-3 text-sm'
                                        )}
                                    >
                                        {
                                            session.user.name && <p className="text-sm font-medium text-gray-900 truncate">{
                                                session.user.name
                                            }</p>
                                        }
                                        <p className="text-sm font-medium text-gray-900 truncate">@{
                                            session.user.handle
                                        }</p>
                                    </button>
                                )}
                            </Menu.Item>


                            <div className="py-1">
                                <Menu.Item>
                                    {({active}) => (
                                        <button
                                            onClick={logout}
                                            type="submit"
                                            className={clsx(
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                'block w-full text-left px-4 py-2 text-sm'
                                            )}
                                        >
                                            <HiLogout className="h-4 w-4 inline-block"/> <span>Logout</span>
                                        </button>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            }
            {
                !session &&
                <>
                    <PopupSignIn isOpen={isOpen} setOpen={setOpen}/>
                    <button className={clsx("inline-block h-8 w-8 rounded-full overflow-hidden bg-gray-100 ",
                        "ring-offset-1 ring-2 ring-blue-200 hover:brightness-75" )}
                            onClick={() => {
                                setOpen(true);
                            }}
                    >
                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </button>
                </>
            }
        </>

    )
}