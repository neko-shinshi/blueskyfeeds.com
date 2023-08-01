export const MAX_FEEDS_PER_USER = 3;
export const MAX_KEYWORDS_PER_FEED = 40;


export const SUPPORTED_LANGUAGES = ["", "en", "pt", "ja", "ko", "uk", "es", "fa", "tr", "de", "nl", "fr", "id"];
export const FEED_MODE = ["keyword", "user"];

export const POST_LEVELS = [{id:"top", txt:"Top-level posts"}, {id:"reply", txt: "Quote Posts & Replies"}];
export const SORT_ORDERS = [
    {id:"new", txt:"Latest - Most recent post at top"},
    {id:"like", txt:"Likes - Highest Likes at top"},
    {id:"ups", txt:"Engagement - Highest Likes, Reposts, & Quote Posts at top"},
    {id:"sLike", txt:"Hot (Likes) - Hacker News sorting algorithm using likes only"},
    {id:"sUps", txt:"Hot (Engagement) - Hacker News sorting algorithm using engagement"},
];
export const PICS_SETTING = [
    {id:"text", txt: "Text-only posts"},
    {id:"pics", txt: "Posts with at least one picture"},
];

export const KEYWORD_SETTING = [
    {id:"text", txt: "Post text"},
    {id:"alt", txt: "Picture Alt-text"},
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