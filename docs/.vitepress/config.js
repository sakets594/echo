export default {
    title: 'ECHO Developer Diary',
    description: 'Behind the scenes of the ECHO game.',
    base: '/echo/docs/',
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Play Game', link: 'https://sakets594.github.io/echo/' },
            { text: 'GitHub', link: 'https://github.com/sakets594/echo' }
        ],
        sidebar: [
            {
                text: 'Dev Diary',
                items: [
                    { text: 'Introduction', link: '/' },
                    { text: 'Lidar Shader', link: '/dev-diary/lidar-shader' },
                    { text: 'Level Generation', link: '/dev-diary/level-generation' },
                    { text: 'Minimap System', link: '/dev-diary/minimap' }
                ]
            }
        ]
    }
}
