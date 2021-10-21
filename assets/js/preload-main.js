window.addEventListener( 'DOMContentLoaded', () => {
    const { ipcRenderer } = require( 'electron' ),
          loginBtn = document.getElementById( 'login-btn' );
        
    // Button Ripple
    loginBtn.addEventListener( 'click', ( e ) => {
        let ripple = document.createElement( 'span' );

        ripple.style.top  = ( e.clientY - loginBtn.offsetTop ) + 'px';
        ripple.style.left = ( e.clientX - loginBtn.offsetLeft ) + 'px';
        ripple.classList.add( 'ripple' );

        loginBtn.appendChild( ripple );

        setTimeout( () =>{
            ripple.remove();
        }, 500 );
    } );

    loginBtn.addEventListener( 'mousemove', ( e ) => {
        const rect = loginBtn.getBoundingClientRect();

        let x = e.clientX - rect.left,
            y = e.clientY - rect.top;

        loginBtn.style.setProperty( '--mouse-gradient-x', x + 'px' );
        loginBtn.style.setProperty( '--mouse-gradient-y', y + 'px' );
    } );

    loginBtn.addEventListener( 'click', () => {
        ipcRenderer.send( 'connectChat' );
    } );
} );
