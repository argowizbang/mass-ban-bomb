window.addEventListener( 'DOMContentLoaded', () => {
    window.api.send( 'initAbout' );

    window.api.receive( 'renderAbout', ( args ) => {
        const items   = [].slice.call( document.getElementsByClassName( 'meta-item' ) );

        items.forEach( ( el ) => {
            switch( el.id ) {
                case 'app-name':
                    el.textContent = args.appName;
                    break;

                case 'description':
                    el.textContent = args.package.description;
                    break;

                case 'version':
                    el.textContent = args.package.version;
                    break;

                case 'dev':
                    el.textContent = args.package.author.name;
                    break;

                case 'license':
                    let licenseLink = el.firstElementChild;

                    licenseLink.href        = 'https://spdx.org/licenses/' + args.package.license + '.html';
                    licenseLink.textContent = args.package.license;
                    licenseLink.addEventListener( 'click', ( event ) => {
                        event.preventDefault();

                        window.api.send( 'openExternalLink', licenseLink.href );
                    } );
                    break;
            }
        } );
    } );
} );
