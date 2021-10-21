window.addEventListener( 'DOMContentLoaded', () => {
    const accountContain      = document.getElementById( 'account-contain' ),
          username            = document.getElementById( 'username' ),
          accountActionButton = document.getElementById( 'account-action' );

    let profilePicture;

    accountActionButton.addEventListener( 'click', ( e ) => {
        window.api.send( 'confirmLogout' );
    } );

    window.api.send( 'initAccount' );

    window.api.receive( 'renderAccount', ( args ) => {

        let usernameText      = '[Not logged in]',
            loginStatus       = 'logged-out';

        if ( args.username ) {
            loginStatus  = 'logged-in';
            usernameText = args.username;
        }

        accountContain.className = loginStatus;

        username.textContent = usernameText;

        if ( args.profilePicture ) {
            profilePicture                               = document.createElement( 'img' );
            profilePicture.src                           = args.profilePicture;
            profilePicture.id                            = 'profile-picture-img';
            profilePicture.alt                           = `Profile Picture for ${args.username}`;
            profilePicture.width = profilePicture.height = 70;

            document.getElementById( 'profile-picture-contain' ).prepend( profilePicture );
        }
    } );

    window.api.receive( 'logoutConfirmed', () => {
        window.api.send( 'logout' );

        username.textContent     = '[Not logged in]';
        accountContain.className = 'logged-out';
        profilePicture.remove();
    } );
} );
