export function respondPageErrors (arr:{val:any, code:number}[]) {
    const found = arr.find(({val}) => val);
    if (found) { return {redirect: `/${found.code}`, permanent: false}; }
    return false;
}