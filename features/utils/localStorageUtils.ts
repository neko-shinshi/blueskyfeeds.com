export const setRememberEmail = email  => {
    if (typeof window !== 'undefined') {
        console.log("setting", email);
        localStorage.setItem("email", email);
    }
}
export const getRememberEmail = () => {
    const email = typeof window !== 'undefined' && localStorage.getItem("email");
    console.log("email:",email);return email;
}
export const clearRememberEmail = () => {
    if (typeof window !== 'undefined') {
        console.log("clear email");
        localStorage.setItem("email", "");
    }
}