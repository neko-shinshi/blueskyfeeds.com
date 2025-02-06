import 'styles/globals.css'
import { SessionProvider } from "next-auth/react"
import Navbar from "features/layout/Navbar";
import {useRouter} from "next/router";

export default function App({ Component, pageProps: { session, ...pageProps }}) {
    const router = useRouter();

    return <SessionProvider session={session}>
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
            <link rel="manifest" href="/site.webmanifest"/>
            <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5"/>
            <meta name="msapplication-TileColor" content="#da532c"/>
            <meta name="theme-color" content="#ffffff"/>
            <Navbar hide={router.query?.hide === "1"}/>
            <main className="w-full grid place-items-center min-h-screen">
                <div className="w-full max-w-7xl bg-blue-400 grid place-items-center h-full pb-14 pt-4">
                    <Component {...pageProps} />
                </div>
            </main>
    </SessionProvider>

}