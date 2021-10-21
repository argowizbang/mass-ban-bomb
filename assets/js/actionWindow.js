const { app, BrowserWindow } = require( 'electron' ),
      path                   = require( 'path' ),
      appPath                = app.getAppPath();

let actionWindow = new BrowserWindow( {
    width:         375,
    height:        500,
    icon:           path.join( __dirname, 'assets/icons/icon.ico' ),
    show:           false,
    webPreferences: {
        preload: path.join( appPath, 'assets/js/preload.js' )
    }
} );

actionWindow.loadFile( path.join( appPath, 'action.html' ) );

actionWindow.on( 'close', ( event ) => {
    event.preventDefault();

    actionWindow.hide();
} );

module.exports = actionWindow;
