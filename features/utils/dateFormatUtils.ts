export const dateToAdminReadableDate = (d) => {
    const date = new Date(d);
    const day = date.toLocaleString('default', { day: '2-digit' });
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.toLocaleString('default', { year: 'numeric' });
    return `${day}-${month}-${year}`;
}

export const dateToReadableDateTime = (d) => {
    const date = new Date(d);
    const day = date.toLocaleString('default', { day: '2-digit' });
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.toLocaleString('default', { year: 'numeric' });
    const weekday = date.toLocaleString('default', { weekday: 'short' });
    let time = date.toLocaleString('default', { hour: '2-digit', hourCycle:"h12" }).replaceAll(".", "");
    switch (time) {
        case "12 am": {time = "12 mn"; break;}
        case "12 pm": {time = "12 nn"; break;}
    }

    return `${month} ${day} ${year} (${weekday}) at ${time}`;
}