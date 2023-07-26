import {signIn} from "next-auth/react";
import {useEffect, useRef, useState} from "react";
import clsx from "clsx";
import {clearRememberEmail, getRememberEmail, setRememberEmail} from "features/utils/localStorageUtils";
import {APP_PASSWORD} from "features/auth/authUtils";
import {BsFillInfoCircleFill} from "react-icons/bs";
import {HiAtSymbol} from "react-icons/hi";
import {useRecaptcha} from "features/auth/RecaptchaProvider";
import Link from "next/link";

export default function FormSignIn() {
    const [password, setPassword] = useState("");
    const [domain, setDomain] = useState("bsky.social");
    const [rememberMe, setRememberMe] = useState(false);

    const emailRef = useRef(null);
    const rememberMeRef = useRef(null);
    const [error, setError] = useState<{msg?:string, part?:string}[]>([]);
    const recaptcha = useRecaptcha();

    useEffect(() => {
        // Run Once, remembered email/username is from localStorage, never from server
        const remembered = getRememberEmail();
        setRememberMe(!!remembered);
        if (emailRef.current) {
            emailRef.current.value = remembered;
            rememberMeRef.current.checked = true;
        }
    }, []);


    const updateDomain = (val) => {
        validateFields(val, emailRef.current.value, password);
        setDomain(val);
    }

    const updateUsername = (val) => {
        validateFields(domain, val, password);
    }

    const updatePassword = (val) => {
        validateFields(domain, emailRef.current.value, val);
        setPassword(val)
    }

    const validateFields = (domain, username, password) => {
        let newErrors:{msg?:string, part?:string}[] = [];
        let regex = /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/;
        if(password.length > 0 && !regex.test(password)) {
            newErrors.push({msg:"Not a valid App Password. Please generate it from website or app", part:"password"});
        }
        regex = /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9\-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/;
        if (!regex.test(domain)) {
            newErrors.push({msg:"Not a valid domain", part:"domain"});
        }
        setError(newErrors);
        return newErrors.length === 0;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            if (!validateFields(domain, emailRef.current.value, password)) {
                return;
            }

            if (typeof recaptcha !== 'undefined') {
                recaptcha.ready(async () => {
                    //@ts-ignore
                    const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                    let usernameOrEmail = emailRef.current.value;
                    usernameOrEmail = usernameOrEmail.startsWith("@")? usernameOrEmail.slice(1) : usernameOrEmail;
                    const result = await signIn(APP_PASSWORD, {redirect:false, service:domain, usernameOrEmail, password, captcha});
                    if (result.status === 200) { // If signin successful
                        if (rememberMe) {
                            setRememberEmail(usernameOrEmail);
                        }
                        location.reload();
                    }
                });
            }
        } catch (e) {
            console.log("ERROR");
            console.log(e);
            if (e.response) {
                console.log(e.response);
            }
        }
    }

    return <div className={
            clsx("inline-block align-bottom bg-white rounded-lg",
                "px-4 pt-5 pb-4 sm:p-6",
                "text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full ")}>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h1 className="mt-3 text-center text-2xl font-extrabold text-gray-900 ">
                <span>Login with a Bluesky App Password to continue</span>
            </h1>
            <Link href="/faq-app-password" target="_blank">
                <div className="flex place-items-center justify-center gap-2">
                <BsFillInfoCircleFill className="w-4 h-4 text-blue-500"/><div className="text-center text-blue-500 hover:text-blue-700 hover:underline">What is an App Password?</div>
                </div>
            </Link>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                        Domain
                    </label>
                    <div className="mt-1 relative">
                        <input id="domain"
                               name="domain"
                               defaultValue="bsky.social"
                               type="text"
                               onChange={(event) => {
                                   updateDomain(event.target.value);
                               }}
                               required
                               className={clsx("appearance-none block w-full px-3 py-2",
                                   error.find(x => x.part === "service" || x.part === "all") && "border-red-600",
                                   "border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
                                   "focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm")}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Username or email address
                    </label>
                    <div className="mt-1 relative">
                        <input ref={emailRef}
                               id="email"
                               name="email"
                               type="text"
                               onChange={(event) => {
                                   updateUsername(event.target.value);
                               }}
                               required
                               className={clsx("pl-8 appearance-none block w-full px-3 py-2",
                                   error.find(x => x.part === "all") && "border-red-600",
                                   "border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
                                   "focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm")}
                        />
                        <div
                            className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none">
                            <HiAtSymbol className="w-4 h-4"/>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="flex justify-items-start place-items-center gap-2 text-sm font-medium text-gray-700">
                        App Password  <Link href="/faq-app-password"><BsFillInfoCircleFill className="w-4 h-4 text-blue-500 hover:text-blue-800"/></Link>
                    </label>
                    <div className="mt-1 relative">
                        <input
                            id="password"
                            name="password"
                            value={password}
                            onChange={(event) => {
                                updatePassword(event.target.value);
                            }}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            required
                            className={clsx("pl-8 appearance-none block w-full px-3 py-2",
                                error.find(x => x.part === "password" || x.part === "all") && "border-red-600",
                                "border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
                                "focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm")}
                        />
                        <div
                            className="absolute inset-y-0 left-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                                      clipRule="evenodd"/>
                            </svg>
                        </div>
                        <div></div>
                    </div>
                </div>
                {
                    error.length > 0 && <div className="text-red-600 text-sm">
                        {error[0].msg}
                    </div>
                }

                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        ref={rememberMeRef}
                        onChange={(event) => {
                            if (!event.target.checked) {
                                clearRememberEmail();
                            }
                            setRememberMe(event.target.checked);
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                        Remember me
                    </label>
                </div>


                <div>
                    <button
                        type="submit"
                        className={
                            clsx("w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2",
                                "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500")
                        }>
                        Continue
                    </button>
                </div>
            </form>
            <div className="mt-4 text-sm">This site is protected by reCAPTCHA and the Google
                <a className="text-blue-500" href="https://policies.google.com/privacy">{" Privacy Policy "}</a> and
                <a className="text-blue-500" href="https://policies.google.com/terms">{" Terms of Service "}</a> apply.
            </div>
        </div>

    </div>
}