export function arraySplitToSize(arr:any[], size:number):any[] {
    let result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

export async function callApiInChunks(arr:any[], chunkSize:number, query:any, callback:any) {
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        callback(await query(chunk));
    }
}