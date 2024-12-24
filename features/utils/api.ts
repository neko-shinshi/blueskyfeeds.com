export function respondApiErrors (res, arr:{val:any, code:number}[]) {
    const found = arr.find(({val}) => !!val);
    console.log("FOUND", found, "return", !!found);
    if (found) { res.status(found.code).send(); }
    return !!found;
}