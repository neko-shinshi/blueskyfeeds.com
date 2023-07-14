export const makeCustomException = (message, metadata) => {
    const error = new Error(message) as any;
    error.metadata = metadata;
    return error;
}