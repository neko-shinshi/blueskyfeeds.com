import {setCookie, getCookie, hasCookie} from "cookies-next";

const COOKIE_PREF_BANNER = "COOKIE_PREF_BANNER"
const COOKIE_PREF_NAVBAR = "COOKIE_PREF_NAVBAR"
const BIND_ACCOUNT = 'BIND_ACCOUNT';

export const hasConsentCookie = () => {
    return typeof window === 'undefined' || hasCookie(COOKIE_PREF_BANNER);
}

export const setConsentCookie = (consent) => {
    setCookie(COOKIE_PREF_BANNER, consent, {maxAge: 100 * 24 * 60 * 60, path:"/", sameSite:"lax", secure:true});
}

export const getConsentType = (type: "preferences" | "analytics") => {
    const cookie = getCookie(COOKIE_PREF_BANNER);
    if (!cookie) { return false; }
    return JSON.parse(cookie as string)[type];
}

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

export const setBindCookie = (req, res, val) => {
    setCookie(BIND_ACCOUNT, val, {maxAge: val === ""? 0 : 3 * 60, httpOnly: true, secure: true, sameSite: "strict", req, res});
}

export const getBindCookie = (req, res) => {
    return getCookie(BIND_ACCOUNT, { req, res });
}