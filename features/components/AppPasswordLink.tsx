export default function AppPasswordLink({text}) {
    return <a className="text-blue-600 hover:text-blue-800 underline"
              href="https://bsky.app/settings/app-passwords">
        {text}
    </a>
}