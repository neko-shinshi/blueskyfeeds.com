const axios = require("axios");
let cachedLocalAxios = null;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL+"/api";
const TIMEOUT_CONNECTION_MS = 120000;
const TIMEOUT_MS = 60000;

async function helperGlobalAxios(method, fullUrl, data, headers) {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    let connectionTimeout = setTimeout(() => {
        source.cancel();
        throw "Connection timed out";
    }, TIMEOUT_CONNECTION_MS);


    let config = {
        url: fullUrl,
        method: method,
        cancelToken: source.token,
        timeout: TIMEOUT_MS,
        headers: {},
    };

    if (data) {
        switch (method) {
            case "post":
            case "patch":
            case "delete":
            case "put": {
                config.data = data;
                break;
            }
            case "get": {
                config.url = `${fullUrl}?${Object.entries(data).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')}`;
                break;
            }
        }
    }

    if (headers) {
        config.headers = {
            ...config.headers,
            ...headers
        };
    }

    try {
        const result = await axios(config);
        return Promise.resolve(result);
    } catch (e) {
        return e.response;
    } finally {
        clearTimeout(connectionTimeout);
    }
}


async function helperLocalAxios (method, url, data = null) {
    if (!cachedLocalAxios) {
        cachedLocalAxios = axios.create({
            baseURL: BASE_URL,
            timeout: TIMEOUT_MS,
            headers:{
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    }

    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    let connectionTimeout = setTimeout(() => {
        source.cancel();
        throw "Connection timed out";
    }, TIMEOUT_CONNECTION_MS);

    try {
        const result = await cachedLocalAxios({
            url: url,
            method: method,
            cancelToken: source.token,
            data: data
        })
        return Promise.resolve(result);
    } catch (e) {
        return e.response;
    } finally {
        clearTimeout(connectionTimeout);
    }
}

const globalGet = async (url, data, headers) => {
    return await helperGlobalAxios("get", url, data, headers);
}

const globalPost = async (url, data, headers) => {
    return await helperGlobalAxios("post", url, data, headers);
}

const localPost = async (url, data) => {
    return await helperLocalAxios("post", url, data);
}

const localDelete = async (url, data) => {
    return await helperLocalAxios("delete", url, data);
}

const localGet = async (url, data) => {
    return await helperLocalAxios("get", data? urlWithParams(url, data) : url);
}



const paramsToEncodedString = (params) => {
    const entries = Object.entries(params);
    const res = entries.length === 0? "" : `?${entries.map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')}`;
    return res;
}

const urlWithParams = (url, params) => {
    return `${url}${paramsToEncodedString(params)}`;
}

module.exports = {
    localGet, localPost, globalPost, globalGet,  urlWithParams, paramsToEncodedString, helperGlobalAxios, localDelete
}