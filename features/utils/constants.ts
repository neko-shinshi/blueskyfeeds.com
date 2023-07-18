export const SIGNATURE = " //Made at BlueskyFeeds.com"
export const SUPPORTED_LANGUAGES = ["", "en", "ja"];
export const POST_LEVELS = [{id:"top", txt:"Top-level posts"}, {id:"reply", txt: "Quote Posts & Replies"}];
export const SORT_ORDERS = [
    {id:"chronological", txt:"Latest - Most recent post at top"},
    {id:"ups", txt:"Engagement - Highest Likes, Reposts, & Quote Posts at top"},
    {id:"likes", txt:"Likes - Highest Likes at top"},
    {id:"scoreLikes", txt:"Hot (Likes) - Hacker News sorting algorithm using likes only"},
    {id:"scoreUps", txt:"Hot (Engagement) - Hacker News sorting algorithm using engagement"},
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