const secondsAfter = seconds => {
    const expireAt = new Date();
    expireAt.setTime(expireAt.getTime() + seconds*1000);
    return expireAt;
}

const timeText = (dateTime) => {
   return new Date(dateTime).toLocaleString();
}

module.exports = {
    timeText, secondsAfter
}