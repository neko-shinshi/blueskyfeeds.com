const clearPosts = async (db) => {
    let date = new Date();
    date.setHours(date.getHours() - 48);

    let date2 = new Date();
    date2.setHours(date2.getHours() - 96);
    const result = await db.posts.deleteMany({$or: [{last:{$lt:date2.getTime()}}, {last:{$exists:false}}], createdAt: {$lte: date.toISOString()}});
    console.log(result);
}

module.exports = {
    clearPosts
}