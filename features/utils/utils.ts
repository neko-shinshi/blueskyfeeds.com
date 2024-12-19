export function arraySplitToSize(arr:any[], size:number):any[] {
    let result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

export async function callApiInChunks(arr:any[], chunkSize:number, query:any, packer:any, numRetry=2) {
    let result:any[] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        let reattempts = numRetry;
        do {
            try {
                const {data: {...data}} = await query(chunk);
                result.push(...packer(data));
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
            result.push(...packer(data));
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