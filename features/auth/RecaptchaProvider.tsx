import {createContext, useContext, useEffect, useState} from "react";
import Script from "next/script";

const RecaptchaContext = createContext<any>(null)

function RecaptchaProvider ({children}) {
    const [recaptcha, setRecaptcha] = useState<any>(null);


    return <RecaptchaContext.Provider value={recaptcha}>
        <Script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} strategy="beforeInteractive" onReady={() => {
            // @ts-ignore
            setRecaptcha(window.grecaptcha);
        }}/>

        {children}
    </RecaptchaContext.Provider>
}

function useRecaptcha() {
    const context = useContext(RecaptchaContext);
    if (context === undefined) {
        throw new Error('useCount must be used within a CountProvider')
    }
    return context;
}

export {RecaptchaProvider, useRecaptcha}