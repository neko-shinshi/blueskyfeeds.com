import {useRouter} from "next/router";
import {useEffect} from "react";
import {useUserData} from "features/provider/UserDataProvider";

export default function UserDataChecker() {
    const router = useRouter();
    const userData = useUserData();
    const {user, last, updateLast} = userData;

    useEffect(() => {
        let hidden = false;
        const visibilityListener = () => {
            if (!user) { return; }
            if (document.hidden) { hidden = true; return; }
            const now = new Date().getTime();
            const diff = now - last;
            if (hidden || diff > 30*1000) {
                hidden = false;
                updateLast(now);
                (async() => {
                    const {status} = await fetch("/api/ping");
                    if (status !== 200) {
                        await router.push(`/${status}`);
                    }
                })();
            }
        }

        document.addEventListener("visibilitychange", visibilityListener);
        document.addEventListener("click", visibilityListener);
        return () => {
            document.removeEventListener("visibilitychange", visibilityListener);
            document.removeEventListener("click", visibilityListener);
        }
    }, [user, userData]);
    return <div/>
}