import {MutableRefObject, useRef, useState} from "react";
import {randomUuid} from "features/utils/randomUtils";
import {UseFormReturn} from "react-hook-form";
import {localPost} from "features/network/network";


export default function RHForm(
    {
        children,
        className,
        useFormReturn,
        cleanUpData,
        postUrl,
        postCallback,
        postError,
        name,
        stopBeforeSend=false,
        formRef=undefined,
        recaptcha
    }:{
        children:any
        className?:string
        useFormReturn:UseFormReturn<any>
        cleanUpData: (data) => any
        postUrl:string,
        postCallback: (result, data) => void
        postError?:(any) => void
        name?:string
        stopBeforeSend?:boolean
        formRef?: MutableRefObject<any> // formRef.current.dispatchEvent(new Event('submit', { cancelable: true }))
        recaptcha?: any
    }) {

    const {
        trigger,
        handleSubmit
    } = useFormReturn;


    const formHandleSubmit = (e) => {
        trigger();

        handleSubmit(async (data) => {
            const cleanData = await cleanUpData(data);
            if (!cleanData) {
                return;
            }
            if (stopBeforeSend) {
                return;
            }
            if (typeof recaptcha !== 'undefined') {
                recaptcha.ready(async () => {
                    //@ts-ignore
                    const captcha = await recaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {action: 'submit'});
                    const result = await localPost(postUrl, {...cleanData, captcha});
                    postCallback(result, cleanData);
                });
            } else {
                const result = await localPost(postUrl, {...cleanData});
                postCallback(result, cleanData);
            }
        })(e).catch(err => {
            console.log(err);
            if (postError) {
                postError(err);
            }
        });
    };


    return (
        <form className={className}
              id={name}
              ref={formRef}
              onSubmit={formHandleSubmit}
        >
            { children }
        </form>
    )
}