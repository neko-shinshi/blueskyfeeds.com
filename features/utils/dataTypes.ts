
// List: Video/Image Preview
// List: Anime Titles and Synonyms
// List: Anime ID, Episode, Timestamp

// Select Animal Names from current anime and related anime
// Form, create new Animal Names

// Tag Multi-Form (max 30)
// Show default tag #anianimalsmoe
// Allow re-ordering of tags to set priority

export type AnimalData = {
    _id:string
    file:string
    gender:string,
    inAnime:[number],
    names:[string],
    relationRoot:number,
    tags:[string],
    type:string,
    owner:string
}

export type SceneData = {
    alt?: string,
    postDate?: string;
    idScene: string
    video?: string
    image: string
    idAniList: number,
    idMal: number,
    relationRoot: number
    complete?:boolean
    ep: string,
    ts: {
        hh: string,
        mm: string,
        ss: string
    },
    title: {
        native:string,
        romaji:string,
        english:string
    },
    file:string,
    synonyms: [string],
    tags: {
        en: [string],
        jp: [string]
    },
    names: {
        en: [string],
        jp: [string]
    }
    animals:[AnimalData],
    time?:string, // scheduled dateTime
}

