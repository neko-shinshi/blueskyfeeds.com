import {createContext, useContext, useEffect, useState} from "react";
import {UserProfileView} from "features/utils/types";
import {getUserData} from "features/utils/cookieUtils";

const UserDataContext = createContext(null)

function UserDataProvider ({children}) {
    const [user, setUser] = useState<UserProfileView|null>(null);
    const [time, setTime] = useState(0);

    useEffect(() => {
        const {user, last} = getUserData();
        setUser(user);
        setTime(last);
    }, []);

    function updateLast(last:number) {
        console.log("updating last to", last);
        setTime(last);
    }


    return <UserDataContext.Provider value={{user, last:time, updateLast}}>
        {children}
    </UserDataContext.Provider>
}

function useUserData():{user:UserProfileView | null, last:number, updateLast:any} {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserDataProvider')
    }
    return context;
}


export {UserDataProvider, useUserData}