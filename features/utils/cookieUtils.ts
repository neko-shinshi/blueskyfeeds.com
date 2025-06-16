import {setCookie, getCookie} from "cookies-next";

const COOKIE_PREF_NAVBAR = "COOKIE_PREF_NAVBAR"
const COOKIE_CLOSING = "COOKIE_CLOSING"


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

export const getAlertCookie = () => {
    return !!getCookie(COOKIE_CLOSING);
}

export const setAlertCookie = () => {
    setCookie(COOKIE_CLOSING, "k",{maxAge:100 * 24 * 60 * 60, path: "/", sameSite:"lax", secure:true});
}
