export const setRememberEmail = email  => {
    if (typeof window !== 'undefined') {
        localStorage.setItem("email", email);
    }
}

export const getRememberEmail = () => {
    return typeof window !== 'undefined' && localStorage.getItem("email");
}

export const clearRememberEmail = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem("email", "");
    }
}