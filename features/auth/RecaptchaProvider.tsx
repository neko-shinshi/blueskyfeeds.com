import {createContext, useContext, useEffect, useState} from "react";
import Script from "next/script";

const RecaptchaContext = createContext<any>(null)

function RecaptchaProvider ({children}) {
    const [recaptcha, setRecaptcha] = useState<any>(null);


    return <RecaptchaContext.Provider value={recaptcha}>
        <Script src={`https://www.google.com/recaptcha/enterprise.js`} strategy="beforeInteractive" onReady={() => {
            // @ts-ignore
            setRecaptcha(window.grecaptcha);
        }}/>

        {children}
    </RecaptchaContext.Provider>
}

function useRecaptcha() {
    const context = useContext(RecaptchaContext);
    if (context === undefined) {
        throw new Error('useRecaptcha must be used within a RecaptchaProvider')
    }
    return context;
}

async function getCaptcha(recaptcha) {
    return new Promise((res, rej) => {
        recaptcha.ready(() => {
            recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'}).then((token) => {
                return res(token);
            })
        })
    })
}

export {RecaptchaProvider, useRecaptcha, getCaptcha}