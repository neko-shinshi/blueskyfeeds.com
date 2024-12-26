import {createContext, useContext, useEffect, useState} from "react";
import {UserProfileView} from "features/utils/types";
import {getUserData} from "features/utils/cookieUtils";
import {localGet} from "features/network/network";
import {useRouter} from "next/router";

const UserDataContext = createContext(null)

function UserDataProvider ({children}) {
    const router = useRouter();
    const [userData, setUserData] = useState<UserProfileView|null>(null);
    function visibilityListener() {
        console.log("visible", userData);
        if (userData) {
            console.log("check");
            (async() => {
                const {status} = await localGet("/profile");
                console.log("visible check", status);
                if (status !== 200) {
                    await router.push(`/${status}`);
                }
            })();
        }
    }

    useEffect(() => {
        setUserData(getUserData());
        document.addEventListener("focus", visibilityListener);
        return () => {
            document.removeEventListener("focus", visibilityListener)
        }
    }, []);

    return <UserDataContext.Provider value={userData}>
        {children}
    </UserDataContext.Provider>
}

function useUserData() {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserDataProvider')
    }
    return context;
}

export {UserDataProvider, useUserData}