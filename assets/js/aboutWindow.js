const { app, shell, BrowserWindow } = require( 'electron' ),
      path                          = require( 'path' ),
      appPath                       = app.getAppPath();

let aboutWindow = new BrowserWindow( {
    width:          471,
    height:         622,
    center:         true,
    icon:           path.join( appPath, 'assets/icons/icon.ico' ),
    minimizable:    false,
    maximizable:    false,
    resizable:      false,
    show:           false,
    webPreferences: {
        preload: path.join( __dirname, 'preload.js' )
    }
} );

aboutWindow.loadFile( path.join( appPath, 'about.html' ) );

aboutWindow.once( 'ready-to-show', ( event ) => {
    aboutWindow.show();
} );

aboutWindow.on( 'close', ( event ) => {
    event.preventDefault();

    aboutWindow.hide();
} );

module.exports = aboutWindow;
