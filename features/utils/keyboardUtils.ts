export const handleEnter = async(event, callback) => {
    if (event.key === 'Enter') {
        await callback()
    }
}