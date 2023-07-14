module.exports = {
    "locales": ["default","en", "jp"],
    "defaultLocale":"default",
    "localeDetection": false,
    "keySeparator": false,
    "logBuild": process.env.NODE_ENV !== 'production',
    "pages": {
        "*": ["common"]
    }
}