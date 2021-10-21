// Enable V8 code cache
require( 'v8-compile-cache' );

// Environment Variables
require( 'dotenv' ).config();

const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, session, shell } = require( 'electron' ),
      path                                                                       = require( 'path' ),
      appPath                                                                    = app.getAppPath(),
      { ElectronAuthProvider }                                                   = require( '@twurple/auth-electron' ),
      preferences                                                                = require( path.join( __dirname, 'assets/js/preferences.js' ) ),
      clientId                                                                   = process.env.CLIENT_ID,
      redirectUri                                                                = process.env.REDIRECT_URI,
      isMac                                                                      = process.platform === 'darwin',
      refreshAccountWindow                                                       = () => {
          let accountWindow = require( path.join( appPath, 'assets/js/accountWindow.js' ) );
    
          accountWindow.webContents.send( 'renderAccount', {
              username:       preferences.value( 'twitch.username'),
              profilePicture: preferences.value( 'twitch.profilePicture' )
          } );
      },
      parseAccountsList                                                          = ( accountsFiles ) => {
          const fs  = require( 'fs' ),
                CSV = require( 'csv-string' );

          let accountsList = '';

          if ( accountsFiles && ! accountsFiles.canceled ) {
              accountsFiles.filePaths.forEach( ( file ) => {
                accountsList += fs.readFileSync( file, { encoding: 'utf-8' } );

                  if ( path.extname( file ) === '.csv' ) {
                      accountsList = accountsList.replace( CSV.detect( accountsList ), '\n' );
                  }

                  accountsList = accountsList.trim() + '\n';
              } );

              mainWindow.webContents.send( 'receiveAccountsList', accountsList );
          }
      },
      confirmStopAction                                                          = ( forceStop = false ) => {
          if ( actionIsFinished ) {
              forceStop = true;
          }

          if ( actionIsRunning || ( ! actionIsRunning && ! forceStop ) ) {
              let choice = dialog.showMessageBoxSync( actionWindow, {
                  title:   'Terminate Running Action',
                  message: 'Are you sure you want to terminate the currently running action?',
                  detail:  'This will immediately terminate the currently running action and prevent any further actions from being taken on the current active list of accounts.',
                  type:    'question',
                  buttons: [
                      'Yes',
                      'No'
                  ],
                  cancelId: 1,
              } );

              if ( choice === 0 ) {
                  actionIsRunning = false;
              } else {
                  return;
              }
          }

          if ( ! actionIsRunning || forceStop ) {
              actionWindow.hide();
              channelIndex     = 0;
              accountIndex     = 0;
              actionIsRunning  = false;
              actionIsFinished = true;

              if ( ! mainWindow.isDestroyed() ) {
                  mainWindow.webContents.send( 'unlockDashboard' );
              }
          }
      },
      delayLoop                                                                  = ( fn, delay ) => {
          return ( x, i ) => {
              setTimeout( () => {
                  fn( x );
              }, i * delay );
          };
      },
      createMainWindow                                                           = () => {
          const mainMenu = require( path.join( __dirname, 'assets/js/menu.js' ) );

          mainWindow = new BrowserWindow( {
              width:          730,
              height:         950,
              icon:           path.join( __dirname, 'assets/icons/icon.ico' ),
              show:           false,
              resizable:      false,
              webPreferences: {
                  preload: path.join( __dirname, 'assets/js/preload.js' )
              }
          } );

          mainWindow.setMenu( mainMenu );

          mainWindow.on( 'close', () => {
              if ( ! isMac ) {
                  app.exit();
              }
          } );

          mainWindow.loadFile( 'index.html' );

          mainWindow.once( 'ready-to-show', () => {
              mainWindow.show();
          } );
      };

// Initialize a few things globally
let mainWindow, actionWindow, client, currentActionDetails, channelIndex, accountIndex,
    actionIsRunning        = false,
    actionIsFinished       = false,
    authProvider           = new ElectronAuthProvider( {
        clientId,
        redirectUri
    } );


// Menu
require( path.join( __dirname, 'assets/js/menu.js' ) );

// Enable global sandboxing
app.enableSandbox();

/**
 * Open main window upon initialization
 */
app.whenReady().then( () => {
    // Set startup theme from preferences
    nativeTheme.themeSource = preferences.value( 'theme.appTheme' ) ?? 'system';

    preferences.on( 'save', ( prefs ) => {
        let modified           = false,
            modChannels        = prefs.twitch.modChannels,
            normalizedChannels = modChannels.map( ( channel ) => {
                return channel.toLowerCase();
            } );

        normalizedChannels.forEach( ( channel, index ) => {
            if ( modChannels[ index ] ) {
                let i;

                for ( i = 0; i < normalizedChannels.length; i++ ) {
                    if ( index === i ) {
                        continue;
                    }

                    if ( channel === normalizedChannels[ i ].toLowerCase() && i > index ) {
                        modChannels.splice( i, 1 );

                        if ( ! modified ) {
                            modified = true;
                        }
                    }
                };
            }
        } );

        if ( modified ) {
            preferences.value( 'twitch.modChannels', modChannels );
        }

        nativeTheme.themeSource = prefs.theme.appTheme;
    } );

    // Okay, let's get the show started
    createMainWindow();

    // Emulate macOS behavior when all windows are closed
    app.on( 'activate', () => {
        if ( BrowserWindow.getAllWindows().length === 0 ) {
            createMainWindow();
        }
    } );
} );


/**
 * Display error message from renderer process
 */
ipcMain.on( 'rendererError', ( event, error ) => {
    dialog.showErrorBox( error.title, error.message );
} );


/**
 * Connect to chat
 */
ipcMain.on( 'connectChat', async ( event, args ) => {
    const tmi          = require( '@twurple/auth-tmi' );

    authProvider.getAccessToken( [
        'chat:read',
        'chat:edit',
        'channel:moderate'
    ] )
        .finally( ( token ) => {
            const { ApiClient } = require( '@twurple/api' ),
                  apiClient = new ApiClient( { authProvider } );

            apiClient.users.getMe()
                .then( ( user ) => {
                    preferences.value( 'twitch.username', user.displayName );
                    preferences.value( 'twitch.profilePicture', user.profilePictureUrl.replace( '300x300.png', '70x70.png' ) );
                } )
                .finally( () => {
                    client = new tmi.Client( {
                        options: {
                            debug: false,
                            messagesLogLevel: 'info'
                        },
                        connection: {
                            reconnect: true,
                            secure: true
                        },
                        authProvider: authProvider,
                        channels: []
                    } );

                    client.on( 'connected', () => {
                        mainWindow.loadFile( 'dashboard.html' );
                    } );

                    refreshAccountWindow();

                    client.connect();
                } )
        } )
        .catch( ( error ) => {
            dialog.showErrorBox( 'Error Thrown', error );
        } );
} );


/**
 * Render "About" window
 */
ipcMain.on( 'initAbout', ( event, args ) => {
    let aboutWindow = require( path.join( appPath, 'assets/js/aboutWindow.js' ) );
    
    aboutWindow.webContents.send( 'renderAbout', {
        appName: app.name,
        package: require( path.join( appPath, 'package.json' ) )
    } );
} );


/**
 * Render "Twitch Account" window
 */
ipcMain.on( 'initAccount', ( event, args ) => {
    let accountWindow = require( path.join( appPath, 'assets/js/accountWindow.js' ) );
    
    accountWindow.webContents.send( 'renderAccount', {
        username:       preferences.value( 'twitch.username'),
        profilePicture: preferences.value( 'twitch.profilePicture' )
    } );
} );


/**
 * Confirm logout from "Twitch Account" window
 */
ipcMain.on( 'confirmLogout', ( event, args ) => {
    let accountWindow = require( path.join( appPath, 'assets/js/accountWindow.js' ) ),
        choice        = dialog.showMessageBoxSync( accountWindow, {
            title:     'Confirm Account Logout',
            message:   'Are you sure you want to log out of your Twitch account?',
            detail:    `Logging out will completely sign out ${app.name} from your Twitch account and immediately stop any mass bans you currently have running.`,
            type:      'question',
            buttons:   [
                'Yes',
                'No'
            ],
            defaultId: 0,
            cancelId:  1
        } );

    if ( choice === 0 ) {
        accountWindow.webContents.send( 'logoutConfirmed' );
    }
} );


/**
 * Logout from "Twitch Account" window
 */
ipcMain.on( 'logout', ( event, args ) => {
    authProvider.getAccessToken().then( ( token ) => {
        const { revokeToken } = require( '@twurple/auth' );
        session.defaultSession.clearStorageData( { storages: 'cookies' } );

        revokeToken( process.env.CLIENT_ID, token.accessToken );

        if ( actionWindow ) {
            actionIsRunning = false;
            confirmStopAction( true );
        }

        preferences.value( 'twitch.username', null );
        preferences.value( 'twitch.profilePicture', null );
        mainWindow.loadFile( 'index.html' );
    } );
} );


/**
 * Open link in OS default browser
 */
ipcMain.on( 'openExternalLink', ( event, url ) => {
    shell.openExternal( url );
} );


/**
 * Grab uploaded file for parsing ban list
 */
ipcMain.on( 'getAccountsFiles', ( event ) => {
    dialog.showOpenDialog( mainWindow, {
        title:      'Choose accounts list file',
        filters:    [
            {
                name:       'Accounts Lists',
                extensions: [ 'csv', 'txt' ]
            },
            {
                name:       'All Files',
                extensions: ['*']
            }
        ],
        properties: [
            'openfile',
            'multiSelections',
            'dontAddToRecent'
        ]
    } )
        .then( parseAccountsList );
} );


/**
 * Send uploaded file to be parsed
 */
ipcMain.on( 'parseAccountsFiles', ( event, accountsFiles) => {
    parseAccountsList( accountsFiles );
} );

/**
 * Open ban window to run and display ban/unban progress
 */
ipcMain.on( 'runAction', ( event, details ) => {
    currentActionDetails = details;

    actionWindow = new BrowserWindow( {
        width:          650,
        height:         800,
        icon:           path.join( __dirname, 'assets/icons/icon.ico' ),
        show:           false,
        maximizable:    false,
        resizable:      false,
        webPreferences: {
            preload: path.join( appPath, 'assets/js/preload.js' )
        }
    } );
    
    actionWindow.loadFile( path.join( appPath, 'action.html' ) );
    
    actionWindow.on( 'close', ( event ) => {
        event.preventDefault();

        confirmStopAction();
    } );

    actionWindow.once( 'ready-to-show', () => {
        actionWindow.show();
    } );

    details.total = details.accounts.length * details.channels.length;

    actionWindow.webContents.on( 'did-finish-load', () => {
        actionIsRunning = true;
        actionWindow.webContents.send( 'listAccounts', details );
    } );
} );

ipcMain.on( 'readyToProcess', ( event, details ) => {
    let resetAccountIndex = false;

    if ( details.continue ) {
        actionIsRunning = true;
    }

    if ( ! channelIndex || actionIsFinished ) {
        channelIndex     = 0;
        actionIsFinished = false;
    }

    if ( ! accountIndex || actionIsFinished ) {
        accountIndex     = 0;
        actionIsFinished = false;
    }

    if ( ! actionIsRunning ) {
        return;
    }

    currentActionDetails.channels.slice( channelIndex ).forEach( delayLoop( ( channel ) => {
        const progressStep   = 1 / currentActionDetails.total;

        if ( actionWindow.isVisible() && actionIsRunning ) {
            if( actionIsRunning && accountIndex === currentActionDetails.accounts.length ) {
                resetAccountIndex = true;
            }

            if ( resetAccountIndex ) {
                resetAccountIndex = false;
                accountIndex      = 0;
            }

            client.join( channel )
                .then(
                    () => {
                        let skipChannel = false;

                        currentActionDetails.accounts.slice( accountIndex ).forEach( delayLoop( ( account ) => {
                            if ( ! skipChannel && actionWindow.isVisible() && actionIsRunning ) {
                                const actionResults = {
                                    action:  currentActionDetails.action,
                                    channel: {
                                        index: channelIndex,
                                        name:  channel
                                    },
                                    account: {
                                        index: accountIndex++,
                                        name:  account
                                    },
                                    step: {
                                        count: 1,
                                        progress: progressStep
                                    },
                                    final: false
                                };

                                client[ currentActionDetails.action ]( channel, account, currentActionDetails.reason )
                                    .then(
                                        ( () => { // Action Successful
                                            
                                            actionResults.success = true;

                                            if ( currentActionDetails.reason ) {
                                                actionResults.reason  = currentActionDetails.reason;
                                            }
                                        } ),
                                        ( ( notice ) => { // Action Unsuccessful
                                            actionResults.success = false;
                                            actionResults.notice  = notice;

                                            if ( notice === 'no_permission' ) {
                                                skipChannel                 = true;
                                                accountIndex                = currentActionDetails.accounts.length;
                                                actionResults.step.count    = currentActionDetails.accounts.length;
                                                actionResults.step.progress = progressStep * currentActionDetails.accounts.length;
                                            }
                                        } )
                                    )
                                    .finally( () => {
                                        if ( accountIndex === currentActionDetails.accounts.length ) {
                                            channelIndex++;

                                            if ( channelIndex >= currentActionDetails.channels.length ) {
                                                actionIsFinished    = true;
                                                actionResults.final = true;
                                                actionWindow.flashFrame( true );
                                            }
                                        }

                                        actionWindow.webContents.send( 'processAccount', actionResults );

                                        return true;
                                    } )
                                    .catch( console.error );
                            }
                        }, 334 ) );
                    },
                    () => {
                        accountIndex = currentActionDetails.accounts.length;

                        actionWindow.webContents.send( 'processAccount', {
                            channel: {
                                name:  channel
                            },
                            success: false,
                            notice: 'no_response',
                            step: {
                                count: currentActionDetails.accounts.length,
                                progress: progressStep * currentActionDetails.accounts.length
                            },
                            final: ++channelIndex === currentActionDetails.channels.length ? true : false
                        } );

                        if ( channelIndex === currentActionDetails.channels.length ) {
                            actionIsFinished = true;
                            actionWindow.flashFrame( true );
                        }
                    }
                )
                .finally(
                    () => {
                        if ( actionIsRunning && accountIndex === currentActionDetails.accounts.length ) {
                            channelIndex++;
                            client.part( channel );
                            return true;
                        }
                    },
                    () => {
                        if ( actionIsRunning && accountIndex === currentActionDetails.accounts.length ) {
                            channelIndex++;
                            client.part( channel );
                            return true;
                        }
                    } )
                .catch( console.error );
        }
    }, currentActionDetails.accounts.length * 334 ) );
} );


/**
 * Pause action
 */
ipcMain.on( 'pauseAction', ( event ) => {
    actionIsRunning = false;
} );


/**
 * Confirm stop action
 */
ipcMain.on( 'confirmStopAction', ( event, forceStop = false ) => {
    confirmStopAction( forceStop );
} );


/**
 * Prevent new windows that aren't to necessary/trusted locations
 */
app.on( 'web-contents-created', ( event, contents ) => {
    contents.on( 'will-navigate', ( event, navigationUrl ) => {
        const parsedUrl = new URL( navigationUrl ),
            whitelist = [
                'http://localhost',
                'https://id.twitch.tv'
            ];

        if ( ! whitelist.includes( parsedUrl.origin ) ) {
            event.preventDefault();
        }
    } );
} );

// Make sure no windows other than the main window have a menu bar
Menu.setApplicationMenu( null );
