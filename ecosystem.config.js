module.exports = {
    apps: [
        {
            name: 'web',
            script: 'server.js',
            args: '',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
        },
    ]
}