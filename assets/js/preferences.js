const { app }                  = require( 'electron' ),
      path                     = require( 'path' ),
      ElectronPreferences      = require( 'electron-preferences' ),
      appPath                  = app.getAppPath();

const preferences = new ElectronPreferences( {
    dataStore: path.resolve( app.getPath( 'userData' ), 'config.json' ),
    defaults:               {
        theme: {
            appTheme: 'system'
        }
    },
    browserWindowOverrides: {
        title:          'Preferences | ' + app.name,
        icon:           path.join( appPath, 'assets/icons/icon.ico' ),
        resizable:      true,
        maximizable:    true,
    },
    css:                    'assets/css/preferences.css',
    sections:               [
        {
            id:    'twitch',
            label: 'Twitch',
            form: {
                groups: [
                    {
                        fields: [
                            {
                                label:     'Moderated Channels',
                                key:       'modChannels',
                                type:      'list',
                                orderable: true,
                                size:      10,
                                style:     { width: '61%' },
                                help:      'Channels you want to moderate with Mass Ban Bomb'
                            }
                        ]
                    }
                ]
            }
        },
        {
            id: 'theme',
            label: 'Theme',
            icon: 'brightness-6',
            form: {
                groups: [
                    {
                        fields: [
                            {
                                label: 'Theme',
                                key: 'appTheme',
                                type: 'radio',
                                options: [
                                    {
                                        label: 'System (default)',
                                        value: 'system'
                                    },
                                    {
                                        label: 'Light',
                                        value: 'light'
                                    },
                                    {
                                        label: 'Dark',
                                        value: 'dark'
                                    }
                                ],
                                help: 'Light or Dark mode?',
                            }
                        ]
                    }
                ]
            }
        }
    ]
} );

module.exports = preferences;
