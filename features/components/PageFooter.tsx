import Image from "next/image";

export default function PageFooter() {
    return <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1">
        <div className="w-full text-center">© <a href="https://www.anianimals.moe" className="text-blue-500 underline">AniAnimals.moe</a> 2023-{new Date().getFullYear()}</div>

        <div className="w-full text-center">
            If you would like to contribute, please visit my
            <a className="ml-1 inline-flex underline text-blue-500 hover:text-blue-800" href="https://ko-fi.com/anianimalsmoe" target="_blank" rel="noreferrer">
                Ko-Fi
                <div className="h-6 w-6">
                    <Image width={25} height={25} alt="ko-fi icon" src="/ko-fi.png"/>
                </div>
            </a>
        </div>
    </div>
}