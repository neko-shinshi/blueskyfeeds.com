import {setCookie, getCookie} from "cookies-next";
import {SESSION_KEY_DURATION, SESSION_MISC_ID} from "features/utils/constants";


const COOKIE_PREF_NAVBAR = "COOKIE_PREF_NAVBAR"


export const getNavbarPosCookie = () => {
    if (typeof window === 'undefined') {
        return "top"
    }
    const cookie = getCookie(COOKIE_PREF_NAVBAR);
    if (!cookie) {
        return "top";
    }
    switch (cookie) {
        case "top":
        case "bottom":
            return cookie;
        default:
            return "top";
    }
}

export const setNavbarPosCookie = (position) => {
    setCookie(COOKIE_PREF_NAVBAR, position,{maxAge:100 * 24 * 60 * 60, path: "/", sameSite:"lax", secure:true});
}


export const defaultCookieOptions = (req, res) => {
    return {
        req, res,
        domain: process.env.NEXT_PUBLIC_DOMAIN,
        path:"/",
        maxAge: SESSION_KEY_DURATION,
        httpOnly:true,
        secure: true,
        sameSite:"lax"
    }
}

export function setUserData ({did, handle, displayName="", avatar, req, res}:{did:string, handle:string, displayName?:string, avatar:string, req, res}) {
    setCookie(SESSION_MISC_ID, JSON.stringify({did, handle, displayName, avatar}), {
        domain: process.env.NEXT_PUBLIC_DOMAIN,
        maxAge:SESSION_KEY_DURATION,
        path: "/",
        sameSite:"lax",
        secure:true,
        httpOnly:false,
        req, res
    });
}


export const getUserData = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    const cookie = getCookie(SESSION_MISC_ID);
    if (!cookie) { return null; }
    const user = JSON.parse(cookie);
    return {user, last: new Date().getTime()};
}