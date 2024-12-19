import { Menu, Transition } from "@headlessui/react";
import clsx from "clsx";
import {HiLogout, HiPlus} from "react-icons/hi";
import {useRouter} from "next/router";
import {Fragment, useEffect, useState} from "react";
import Image from "next/image";
import {HiListBullet} from "react-icons/hi2";
import Link from "next/link";
import FormSignIn from "features/login/FormSignIn";
import Popup from "features/components/Popup";
import {UserProfileView} from "features/utils/types";

export default function NavButtonUserAvatar({navPosition, userData}:{navPosition:"top"|"bottom", userData: UserProfileView}) {
    const router = useRouter();
    const [isOpen, setOpen] = useState(false);


    useEffect(() => {
        setOpen(false);
    }, [router]);

    return (
        <>
            {
                userData &&
                <Menu as="div" className="relative inline-block text-left">
                    <Menu.Button
                        className="inline-block justify-center h-8 w-8 rounded-full overflow-hidden bg-gray-500 shadow-inner ring-1 ring-white">
                        {
                            userData.avatar ?
                                <div className="h-8 w-8">
                                    <Image width={50} height={50} src={userData.avatar} alt="user-avatar" onError={() => { /* DO NOTHING */}}/></div> :
                                <span className="text-sm font-medium leading-none text-white select-none">
                                    {(userData.displayName || userData.handle).charAt(0)}
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
                                            userData.displayName && <p className="text-sm font-medium text-gray-900 truncate">{
                                                userData.displayName
                                            }</p>
                                        }
                                        <p className="text-sm font-medium text-gray-900 truncate">@{
                                            userData.handle
                                        }</p>
                                    </button>
                                )}
                            </Menu.Item>

                            <div className="py-1">
                                <Menu.Item>
                                    {({active}) => (
                                        <Link href="/my-feeds">
                                            <button
                                                type="button"
                                                className={clsx(
                                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                    'flex place-items-center w-full text-left px-4 py-2 text-sm'
                                                )}
                                            >
                                                <HiListBullet className="h-4 w-4 inline-block mr-2"/> <span>My Feeds</span>
                                            </button>
                                        </Link>
                                    )}
                                </Menu.Item>
                            </div>

                            <div className="py-1">
                                <Menu.Item>
                                    {({active}) => (
                                        <Link href="/edit-feed">
                                            <button
                                                type="button"
                                                className={clsx(
                                                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                    'flex place-items-center w-full text-left px-4 py-2 text-sm'
                                                )}
                                            >
                                                <HiPlus className="h-4 w-4 inline-block mr-2"/> <span>Make a new Feed</span>
                                            </button>
                                        </Link>

                                    )}
                                </Menu.Item>
                            </div>

                            <div className="py-1">
                                <Menu.Item>
                                    {({active}) => (
                                        <Link
                                            href="/signout"
                                            type="button"
                                            className={clsx(
                                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                                'flex place-items-center w-full text-left px-4 py-2 text-sm'
                                            )}
                                        >
                                            <HiLogout className="h-4 w-4 inline-block mr-2"/> <span>Logout</span>
                                        </Link>
                                    )}
                                </Menu.Item>
                            </div>
                        </Menu.Items>
                    </Transition>
                </Menu>
            }
            {
                !userData &&
                <>
                    <Popup isOpen={isOpen} setOpen={setOpen}>
                        <FormSignIn />
                    </Popup>
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