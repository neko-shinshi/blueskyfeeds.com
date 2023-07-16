export const serializeFile = async (url) => {
    const blob = await fetch(url).then(res => res.blob());
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}