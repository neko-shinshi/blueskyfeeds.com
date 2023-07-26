import Head from "next/head";
import {useRouter} from "next/router";


const DEFAULT_IMAGE_URL = "https://files.anianimals.moe/blueskyfeeds-banner.jpg";
const DEFAULT_IMAGE_DESCRIPTION = "BlueSkyFeeds Banner";

export default function HeadExtended(
    {
        title,
        description,
        canonicalPath,
        isArticle,
        imageUrl,
        imageDescription,
    }:{
        title:string,
        description:string,
        canonicalPath?:string,
        isArticle?:boolean,
        imageUrl?:string
        imageDescription?:string
    }) {
    const router = useRouter();
    const path = (canonicalPath && `${process.env.NEXT_PUBLIC_BASE_URL}/${canonicalPath}`) || // locale already considered
        `${process.env.NEXT_PUBLIC_BASE_URL}${router.pathname == "/"? "": router.pathname}`; // router pathname starts with '/'
    return (
        <Head>
            <title>{title}</title>
            <link rel="canonical" href={path} />
            <link rel="alternate" href={path} hrefLang="en" />

            <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
            <meta name="description" content={description}/>

            <meta property="og:title" content={title} />
            <meta property="og:url" content={path} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content={isArticle?"article": "website"} />
            <meta property="og:image" content={imageUrl || DEFAULT_IMAGE_URL} />
            <meta property="og:image:alt" content={imageDescription || DEFAULT_IMAGE_DESCRIPTION} />

            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:card" content={"summary"} />
            <meta name="twitter:site" content="@AniAnimals_Moe"/>
            <meta name="twitter:creator" content="@AniAnimals_Moe"/>
            <meta name="twitter:image" content={imageUrl || DEFAULT_IMAGE_URL} />
            <meta name="twitter:image:alt" content={imageDescription || DEFAULT_IMAGE_DESCRIPTION} />
        </Head>
    )
}