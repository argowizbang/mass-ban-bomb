window.addEventListener( 'DOMContentLoaded', () => {
    const accountsTable     = document.getElementById( 'action-table-body' ),
          currentCount      = document.getElementById( 'current-count' ),
          totalCount        = document.getElementById( 'total-count' ),
          progressBar       = document.getElementById( 'progress-bar' ),
          pauseActionBtn    = document.getElementById( 'pause-action' ),
          continueActionBtn = document.getElementById( 'continue-action' );

    let actionUpperCase,
        currentAccountIndex = 0;

    pauseActionBtn.addEventListener( 'click', () => {
        window.api.send( 'pauseAction' );
        document.body.classList.add( 'paused' );
    } );

    continueActionBtn.addEventListener( 'click', () => {
        window.api.send( 'readyToProcess', {
            continue: true,
            accountIndex: currentAccountIndex
        } );

        document.body.classList.remove( 'paused' );
    } );

    document.getElementById( 'stop-action' ).addEventListener( 'click', () => {
        window.api.send( 'confirmStopAction' );
    } );

    document.getElementById( 'close-window' ).addEventListener( 'click', () => {
        window.api.send( 'confirmStopAction', true );
    } );

    window.api.receive( 'listAccounts', ( details ) => {
        actionUpperCase = details.action.charAt( 0 ).toUpperCase() + details.action.slice( 1 );
        document.body.classList.add ( details.action + 'ning' );

        // Populate "Action" heading
        document.getElementById( 'action' ).textContent = actionUpperCase;

        // Populate "ban reason" textarea
        if ( details.action === 'ban' && details.reason ) {
            document.getElementById( 'ban-reason' ).textContent = details.reason;
        }

        details.channels.forEach( ( channel ) => {
            const channelRow      = document.createElement( 'tr' ),
                  channelItem     = document.createElement( 'td' ),
                  channelName     = document.createElement( 'span' ),
                  channelAccounts = document.createElement( 'td' ),
                  accountsList    = document.createElement( 'ul' );

            /**
             * Build channel row/cell
             */
            channelRow.id = 'channel-' + channel.toLowerCase();

            channelItem.className   = 'channel-item';

            channelName.className   = 'channel-name';
            channelName.textContent = channel;

            channelAccounts.className = 'accounts-to-action';

            channelItem.appendChild( channelName );
            channelRow.appendChild( channelItem );

            /**
             * Build accounts cell/list
             */
            accountsList.id        = channelRow.id + '-accounts';
            accountsList.className = 'channel-accounts';

            channelAccounts.appendChild( accountsList );

            channelRow.appendChild( channelAccounts );

            /**
             * List accounts in channel row
             */
            details.accounts.forEach( ( account ) => {
                const accountItem  = document.createElement( 'li' ),
                      accountName  = document.createElement( 'span' );

                accountItem.className   = 'list-item account-item account-' + account;

                accountName.className   = 'account-name';
                accountName.textContent = account;

                accountItem.appendChild( accountName );
                accountsList.appendChild( accountItem );
            } );

            accountsTable.appendChild( channelRow );
        } );

        currentCount.textContent = 0;
        totalCount.textContent   = details.total;

        window.api.send( 'readyToProcess', details );
    } );

    window.api.receive( 'processAccount', ( actionDetails ) => {
        const channelRow  = document.getElementById( 'channel-' + actionDetails.channel.name.toLowerCase() ),
              channelItem = channelRow.getElementsByClassName( 'channel-item' )[0],
              channelName = channelRow.getElementsByClassName( 'channel-name' )[0],
              affected    = {};

            let accountItem, accountName;

        if ( actionDetails.account ) {
            accountItem = channelRow.getElementsByClassName( 'account-' + actionDetails.account.name )[0],
            accountName = accountItem.firstElementChild;

            affected.item = accountItem,
            affected.name = accountName;
        }

        let itemClass, nameNote, processedNote;

        if ( actionDetails.success ) {
            itemClass = actionDetails.action + '_success';
            nameNote  = actionUpperCase + 'ned';
        } else {
            switch ( actionDetails.notice ) {
                case 'already_banned':
                    processedNote = 'Already Banned';
                    break

                case 'bad_ban_admin':
                    processedNote = 'Can\'t Ban Admin';
                    break;

                case 'bad_ban_broadcaster':
                    processedNote = 'Can\'t Ban Streamer';
                    break;

                /**
                 * I know global mods are no longer a thing but I also know there's been requests
                 * for Twitch to add "Stream Team" global mods so I'm keeping this here in case it
                 * gets used for that
                 */
                case 'bad_ban_global_mod':
                    processedNote = 'Can\'t ban global moderator';
                    break;

                case 'bad_ban_self':
                    processedNote = 'Can\'t ban yourself';
                    break;

                case 'bad_unban_no_ban':
                    processedNote = 'Not Banned';
                    break;

                case 'invalid_user':
                    processedNote = 'Account doesn\'t exist';
                    break;

                case 'no_permission':
                    processedNote = 'Not a moderator';
                    affected.item = channelItem;
                    affected.name = channelName;
                    break;

                case 'no_response':
                    processedNote = 'Channel doesn\'t exist';
                    affected.item = channelItem;
                    affected.name = channelName;
                    break;
            }

            itemClass = actionDetails.notice;
            nameNote  = processedNote;
        }

        affected.item.classList.add( itemClass );

        affected.name.classList.add( 'has-note' );
        affected.name.dataset.note  = nameNote;

        progressBar.value          += actionDetails.step.progress;
        currentCount.textContent    = parseInt( currentCount.textContent ) + actionDetails.step.count;
        
        if ( actionDetails.final ) {
            document.body.classList.add( 'action-complete' );
            document.getElementById( 'page-title' ).textContent = 'Finished!';
            window.api.send( 'pauseAction' );
        }
    } );

    window.api.receive( 'closeActionWindow', () => {
        if ( document.body.classList.contains( 'action-complete' ) ) {
            window.api.send( 'closeActionWindow' , true );
        }
    } );
} );
