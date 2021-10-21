const { app, BrowserWindow } = require( 'electron' ),
      path                   = require( 'path' ),
      appPath                = app.getAppPath();

let accountWindow = new BrowserWindow( {
    width:          700,
    height:         175,
    center:         true,
    icon:           path.join( appPath, 'assets/icons/icon.ico' ),
    resizable:      false,
    show:           false,
    webPreferences: {
        preload: path.join( __dirname, 'preload.js' )
    }
} );

accountWindow.loadFile( path.join( appPath, 'account.html' ) );

accountWindow.on( 'close', ( event ) => {
    event.preventDefault();

    accountWindow.hide();
} );

module.exports = accountWindow;
