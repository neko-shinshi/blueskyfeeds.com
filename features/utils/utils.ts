
export function sortWithSelectors(arr:any[], selectors:any[]) {
    arr.sort((a, b) => {
        for (const selector of selectors) {
            const result = selector(a, b);
            if (result === 0) {
                continue;
            }
            return result;
        }
    });
}

export async function callApiInChunks(arr:any[], chunkSize:number, query:any, packer:any, numRetry=2, isBskyApi=true) {
    let result:any[] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        let reattempts = numRetry;
        do {
            try {
                console.log("querying", chunk);
                if (isBskyApi) {
                    const {data: {...data}} = await query(chunk);
                    result.push(...packer(data));
                } else {
                    result.push(...packer(await query(chunk)));
                }

                reattempts = 0;
            } catch (e) {
                console.error(e);
                if (reattempts > 0) {
                    reattempts--;
                    console.error("retrying, retries left", reattempts);
                } else {
                    throw e;
                }
            }
        } while (reattempts > 0);
    }
    return result;
}

export async function queryWithCursor (command, paramObj, packer, numRetry=2) {
    let cursorObj: any = {};
    let result:any[] = [];
    let reattempts = numRetry;
    do {
        try {
            const {data:{cursor:newCursor, ...data}} = await command({...paramObj, ...cursorObj});
            if (newCursor && newCursor === cursorObj?.cursor) { break; /* Looping! Stop without processing */ }
            //console.log(JSON.stringify(data, null, 2));
            const packedData = packer(data);
            if (Array.isArray(packedData)) {
                result.push(...packedData);
            }

            if (!newCursor) { break; }
            cursorObj.cursor = newCursor;
            reattempts = numRetry; // succeed, reset reattempts
        } catch (e) {
            if (e.error === "InvalidRequest") { throw e; } // Don't retry invalid
            console.error(e);
            if (reattempts > 0) {
                reattempts--;
                console.error("retrying, retries left", reattempts);
            } else {
                throw e;
            }
        }
    } while (cursorObj);
    return result;
}

export function swapOrder(x:number, y:number, arr:any[]):any[]  {
    const temp = arr[x];
    arr[x] = arr[y];
    arr[y] = temp;
    return Array.from(arr);
}

export function cleanupStringToArray(v:string):string[] {
    return v.replace(/[\[\]'"]/g, "").split(/,(\s)?/).filter(x => !!x && x.trim().length > 0);
}