export function respondApiErrors (res, arr:{val:any, code:number}[]) {
    const found = arr.find(({val}) => !!val);
    if (found) { res.status(found.code).send("k"); }
    return !!found;
}