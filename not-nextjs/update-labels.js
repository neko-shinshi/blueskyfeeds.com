const updateLabels = async (db, agent) => {
    const now = new Date();
    // 1 min ago
    now.setMinutes(now.getMinutes()-1);
    const _1MinAgo = now.toISOString();
    // 5 min ago
    now.setMinutes(now.getMinutes()-10);
    const _10MinAgo = now.toISOString();

    const postIds = (await db.posts.find({
        hasImage:true,
        labelsFetched:{$ne: true},
        createdAt:{$gt: _10MinAgo, $lt: _1MinAgo}
    }).project({_id:1}).toArray()).map(x => x._id);

    if (postIds.length > 0) {
        const MAX_QUERY = 25;

        let commands = [];
        for (let i = 0; i < postIds.length; i += MAX_QUERY) {
            const uris = postIds.slice(i, i + MAX_QUERY);
            try {
                const {data:{posts}} = (await agent.api.app.bsky.feed.getPosts({uris}));
                if (posts && Array.isArray(posts) && posts.length > 0) {
                    posts.forEach(post => {
                        let {uri, labels} = post;
                        labels = labels.reduce((acc, label) => {
                            const {val, neg} = label;
                            if (!neg) {
                                acc.push(val);
                            }
                            return acc;
                        }, []);
                        commands.push({
                            updateOne: {
                                filter: {_id: uri},
                                update: {$set: {labels, labelsFetched:true}}
                            }
                        });
                    });
                }
            } catch (e) {
                console.log(e);
            }
        }
        console.log("label fetched", await db.posts.bulkWrite(commands, {ordered:false}));
    }

}

module.exports = {
    updateLabels
}