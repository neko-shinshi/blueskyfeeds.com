import Navbar from "features/layout/Navbar";
import {useRouter} from "next/router";

export function MainWrapper({children, userData}) {
    const router = useRouter();
    return <>
        <Navbar hide={router.query?.hide === "1"} userData={userData}/>
        <main className="w-full grid place-items-center min-h-screen">
            <div className="w-full max-w-7xl bg-blue-400 grid place-items-center h-full pb-14 pt-4">
                {children}
            </div>
        </main>
    </>
}