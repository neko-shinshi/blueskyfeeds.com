import Image from "next/image";

export default function PageFooter() {
    return <div className="p-2 bg-white rounded-xl border-2 border-black space-y-1">
        <div className="w-full text-center">© <a href="https://www.anianimals.moe" className="text-blue-500 underline">AniAnimals.moe</a> 2023-{new Date().getFullYear()}</div>
    </div>
}