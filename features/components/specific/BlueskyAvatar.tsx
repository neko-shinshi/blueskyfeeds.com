import Image from "next/image";

export default function BlueskyAvatar ({type, avatar, uri}:{type:"user"|"feed", avatar:string, uri:string}) {
    return <>
        {
            type === "feed" && <div className="w-14 h-14 aspect-square hover:blur-xs">
                <a href={`https://bsky.app/profile/${uri.slice(5).replace("app.bsky.feed.generator", "feed")}`}>
                    {
                        avatar? <Image
                            width={70}
                            height={70}
                            src={avatar}
                            className="rounded-xl text-transparent"
                            alt='Feed Image'
                        />: <svg className="bg-[#0070FF] rounded-xl" viewBox="0 0 32 32">
                            <path d="M13.5 7.25C13.5 6.55859 14.0586 6 14.75 6C20.9648 6 26 11.0352 26 17.25C26 17.9414 25.4414 18.5 24.75 18.5C24.0586 18.5 23.5 17.9414 23.5 17.25C23.5 12.418 19.582 8.5 14.75 8.5C14.0586 8.5 13.5 7.94141 13.5 7.25ZM8.36719 14.6172L12.4336 18.6836L13.543 17.5742C13.5156 17.4727 13.5 17.3633 13.5 17.25C13.5 16.5586 14.0586 16 14.75 16C15.4414 16 16 16.5586 16 17.25C16 17.9414 15.4414 18.5 14.75 18.5C14.6367 18.5 14.5312 18.4844 14.4258 18.457L13.3164 19.5664L17.3828 23.6328C17.9492 24.1992 17.8438 25.1484 17.0977 25.4414C16.1758 25.8008 15.1758 26 14.125 26C9.63672 26 6 22.3633 6 17.875C6 16.8242 6.19922 15.8242 6.5625 14.9023C6.85547 14.1602 7.80469 14.0508 8.37109 14.6172H8.36719ZM14.75 9.75C18.8906 9.75 22.25 13.1094 22.25 17.25C22.25 17.9414 21.6914 18.5 21 18.5C20.3086 18.5 19.75 17.9414 19.75 17.25C19.75 14.4883 17.5117 12.25 14.75 12.25C14.0586 12.25 13.5 11.6914 13.5 11C13.5 10.3086 14.0586 9.75 14.75 9.75Z" fill="white">
                            </path>
                        </svg>
                    }
                </a>
            </div>
        }
        {
            type === "user" && <div className="w-12 h-12 aspect-square">
                <a className="hover:blur-xs" href={`https://bsky.app/profile/${uri}`}>
                    {
                        avatar? <Image
                            height={50}
                            width={50}
                            src={avatar}
                            className="rounded-full text-transparent"
                            alt='User Image'
                        />: <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="none"
                                 data-testid="userAvatarFallback">
                            <circle cx="12" cy="12" r="12" fill="#0070ff"></circle>
                            <circle cx="12" cy="9.5" r="3.5" fill="#fff"></circle>
                            <path strokeLinecap="round" strokeLinejoin="round" fill="#fff" d="M 12.058 22.784 C 9.422 22.784 7.007 21.836 5.137 20.262 C 5.667 17.988 8.534 16.25 11.99 16.25 C 15.494 16.25 18.391 18.036 18.864 20.357 C 17.01 21.874 14.64 22.784 12.058 22.784 Z"></path>
                        </svg>
                    }

                </a>
            </div>
        }
    </>
}