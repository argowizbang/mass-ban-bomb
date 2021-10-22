const { contextBridge, ipcRenderer } = require( 'electron' ),
      sendChannels = [
        'confirmLogout',
        'confirmStopAction',
        'connectChat',
        'continueAction',
        'getAccountsFiles',
        'getPreferences',
        'initAbout',
        'initAccount',
        'logout',
        'openExternalLink',
        'parseAccountsFiles',
        'pauseAction',
        'readyToProcess',
        'rendererError',
        'runAction',
        'showPreferences'
    ];

contextBridge.exposeInMainWorld(
    'api', {
        send: ( channel, data ) => {
            if ( sendChannels.includes( channel ) ) {
                ipcRenderer.send( channel, data );
            }
        },
        sendSync: ( channel, data ) => {
            if ( sendChannels.includes( channel ) ) {
                return ipcRenderer.sendSync( channel, data );
            }
        },
        receive: ( channel, func ) => {
            let validChannels = [
                'getPreferences',
                'listAccounts',
                'logoutConfirmed',
                'preferencesUpdated',
                'processAccount',
                'renderAbout',
                'receiveAccountsList',
                'renderAccount',
                'unlockDashboard'
            ];

            if ( validChannels.includes( channel ) ) {
                ipcRenderer.on( channel, ( event, ...args ) => { func( ...args ); } );
            }
        }
    }
);
