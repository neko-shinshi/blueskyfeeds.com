
export default function ErrorCode ({title, text1, text2, btnText, btnOnClick, href}) {

    return (
            <div className="max-w-max mx-auto">
                <div className="sm:flex bg-white rounded-xl p-8">
                    <p className="text-6xl font-extrabold text-indigo-600 sm:text-5xl">{title}</p>
                    <div className="sm:ml-6">
                        <div className="sm:border-l sm:border-gray-200 sm:pl-6">
                            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">{text1}</h1>
                            {
                                text2 && <p className="mt-1 text-base text-gray-500">{text2}</p>
                            }
                        </div>
                        <div className="content-center mt-10 sm:border-l sm:border-transparent flex justify-center items-center">
                            {
                                href &&
                                    <a href={href}
                                       className="inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        {btnText}
                                    </a>
                            }
                            {
                                btnOnClick &&
                                    <a onClick={btnOnClick}
                                       className="inline-flex px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        {btnText}
                                    </a>
                            }
                        </div>
                    </div>
                </div>
            </div>
    )
}