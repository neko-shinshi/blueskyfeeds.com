export const MAX_FEEDS_PER_USER = 10;
export const MAX_KEYWORDS_PER_LIVE_FEED = 100;
export const MAX_KEYWORDS_PER_USER_FEED = 3;

export const SUPPORTED_CW_LABELS = ["nudity", "sexual", "porn", "corpse"];
export const SUPPORTED_LANGUAGES = ["", "en", "pt", "ja", "ko", "uk", "es", "fa", "tr", "de", "nl", "fr", "id"];

export const PRIVACY_MODES = [
    {id:"public", txt:"This feed is visible by everyone"},
    {id:"private", txt:"This feed's contents should only be visible to me"},
    {id:"shared", txt:"This feed's contents should only be visible to a list of users and myself"},
]
export const FEED_MODES = [
    {id:"live", txt:"Listens for live posts. Only stores posts for 4 days."},
    {id:"user", txt:"Looks at a specific user's data."},
    {id:"posts", txt: "Shows a specific list of posts"},
    {id:"responses", txt: "See live responses to posts from a list of users"}
];
export const USER_FEED_MODE = [
    {id:"posts", txt:"Search user's posts"},
    {id:"likes", txt:"Search user's likes."},
];

export const POST_LEVELS = [{id:"top", txt:"Top-level posts"}, {id:"reply", txt: "Replies"}];
export const SORT_ORDERS = [
    {id:"new", txt:"Latest - Most recent post on top", mode:["live", "user", "responses"]},
    {id:"like", txt:"Likes - Highest Likes on top", mode:["live", "responses"]},
    {id:"ups", txt:"Engagement - Highest Total Likes & Reposts on top", mode:["live", "responses"]},
    {id:"sLike", txt:"Hot (Likes) - Hacker News ranking algorithm using likes only", mode:["live"]},
    {id:"sUps", txt:"Hot (Engagement) - Hacker News ranking algorithm using engagement", mode:["live"]},
];
export const PICS_SETTING = [
    {id:"text", txt: "Text-only posts"},
    {id:"pics", txt: "Posts with at least one picture"},
    {id: "video", txt: "Posts with an embedded video"}
];

export const KEYWORD_SETTING = [
    {id:"text", txt: "Post text"},
    {id:"alt", txt: "Picture Alt-text"},
    {id:"link", txt: "Link Urls"},
];


export const KEYWORD_TYPES = ['token', 'segment', 'hashtag'] as const;
export type KeywordType = typeof KEYWORD_TYPES[number];
export const KeywordTypeToShort = (type:KeywordType) => {
    switch (type) {
        case "token": return "t";
        case "segment": return "s";
        case "hashtag": return "#";
    }
}

export type FeedKeyword = {
    t:"t" // Token
    w:string
    r: {p: string, s: string }[]
    a:boolean
} | {
    t:"s" // Segment
    w:string
    r:{p: string, s: string }[]
    a:boolean
} | {
    t:"#" // Hashtag
    w:string
    a:boolean
}

export const SESSION_KEY_DURATION = 30 * 24 * 60 * 60; // 30 days
export const SESSION_KEY_ID = "sk";