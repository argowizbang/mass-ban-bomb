/**
 * Menu
 */
let aboutWindow, accountWindow;

const { app, BrowserWindow, clipboard, shell, Menu } = require( 'electron' ),
      path                                           = require( 'path' ),
      appPath                                        = app.getAppPath(),
      package                                        = require( path.join( appPath, 'package.json' ) ),
      isMac                                          = process.platform === 'darwin',
      preferences                                    = require( path.join( appPath, 'assets/js/preferences.js' ) ),
      template                                       = [
          ...isMac ? [ {
              label: app.name,
              submenu: [
                  { role: 'about' },
                  { type: 'separator' },
                  { role: 'services' },
                  { type: 'separator' },
                  { role: 'hide' },
                  { role: 'hideOthers' },
                  { role: 'unhide' },
                  { type: 'separator' },
                  { role: 'quit' }
              ]
          } ] : [],
          { role: 'fileMenu' },
          { role: 'editMenu' },
          {
              label: 'Settings',
              submenu: [
                  {
                      label: 'Edit Preferences',
                      click: () => {
                          preferences.show();
                      }
                  },
                  {
                      label: 'Twitch Account',
                      click: () => {
                          accountWindow = require( path.join( appPath, 'assets/js/accountWindow.js' ) );
                          
                          if ( accountWindow ) {
                              accountWindow.show();

                              return accountWindow;
                          }

                      }
                  }
              ]
          },
          {
              label: 'Help',
              submenu: [
                  {
                      label: `About ${app.name}`,
                      click: () => {
                          if ( aboutWindow ) {
                              aboutWindow.show();

                              return aboutWindow;
                          }

                          aboutWindow = require( path.join( appPath, 'assets/js/aboutWindow.js' ) );
                      }
                  },
                  {
                      label: 'Developer',
                      submenu: [
                          {
                              label: 'Developed by: ArgoWizbang',
                              enabled: false
                          },
                          { type: 'separator' },
                          {
                              label:   'Have a suggestion or just general feedback?',
                              enabled: false
                          },
                          {
                              label:   'Feel free to contact me using one of the methods below!',
                              enabled: false
                          },
                          { type: 'separator' },
                          {
                              label: `Email: ${process.env.DEV_EMAIL} (click to copy)`,
                              click: () => {
                                  clipboard.writeText( process.env.DEV_EMAIL );
                            }
                          },
                          {
                              label: 'Twitter: @ArgoWizbang (click to open in browser)',
                              click: async () => {
                                  await shell.openExternal( 'https://twitter.com/' + process.env.DEV_TWITTER );
                              }
                          }
                    ]
                  },
                  {
                      label: `${app.name} on GitHub`,
                      click: async () => {
                          await shell.openExternal( 'https://github.com/argowizbang/mass-ban-bomb' );
                      }
                  },
                  {
                      label: 'Report a bug',
                      click: async () => {
                          await shell.openExternal( package.bugs.url )
                      }
                  },
                  {
                      label: 'Donate on Ko-fi',
                      click: async () => {
                          await shell.openExternal( 'https://ko-fi.com/' + process.env.DEV_KOFI );
                      }
                  }
              ]
          }
      ],
      menu                                           = Menu.buildFromTemplate( template );

module.exports = menu;
