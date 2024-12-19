import {setCookie, getCookie} from "cookies-next";
import {SESSION_KEY_DURATION, SESSION_KEY_ID} from "features/utils/constants";

export const SUPPORTED_CW_LABELS = ["nudity", "sexual", "porn", "graphic-media"];

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

export const updateSessionCookie = (data, req, res) => {
    setCookie(SESSION_KEY_ID, JSON.stringify(data), {
        req, res,
        domain: process.env.NEXT_PUBLIC_DOMAIN,
        path:"/",
        maxAge: SESSION_KEY_DURATION,
        httpOnly:true,
        secure: true,
        sameSite:"strict"
    });
}