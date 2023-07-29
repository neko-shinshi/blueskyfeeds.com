const atob = (base64) => {
    if (typeof window === 'undefined') {
        const buffer = Buffer.from(base64, 'base64');
        return buffer.toString('binary');
    } else {
        return window.atob(base64);
    }
};

export const parseJwt = (token) => {
    var base64Url = token.accessJwt.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}