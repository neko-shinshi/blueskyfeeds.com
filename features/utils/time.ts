
export function getTimezoneTime(date:Date) {
    return date.toLocaleString("en-GB", {timeZone:process.env.TIMEZONE as string});
}