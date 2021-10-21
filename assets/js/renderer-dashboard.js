window.addEventListener( 'DOMContentLoaded', () => {
    const dashboardForm        = document.getElementById( 'action-form' ),
          formContent          = document.getElementById( 'form-content' ),
          accountsListTextArea = document.getElementById( 'accounts-list' ),
          dropZone             = document.getElementById( 'accounts-file-drop-zone' ),
          channelsSelect       = document.getElementById( 'channels-select' ),
          banReasonContain     = document.getElementById( 'ban-reason-contain' ),
          banReasonInput       = document.getElementById( 'ban-reason' ),
          unbanCB              = document.getElementById( 'unban-action-cb' ),
          confirmCB            = document.getElementById( 'confirm-cb' ),
          launchBtn            = document.getElementById( 'launch-button' ),
          preferences          = window.api.sendSync( 'getPreferences' ),
          selectAllChannels    = ( menuIndex ) => {
              [].slice.call( document.getElementsByClassName( 'side-by-side-multiselect__inner' )[ menuIndex ].getElementsByClassName( 'side-by-side-multiselect__option' ) ).forEach( ( option ) => {
                  option.click();
                  if ( menuIndex === '1' ) {
                    document.getElementsByClassName( 'trash' )[0].click();
                  }
              } );
          },
          populateChannels     = ( channels ) => {
              let existingSelect = document.getElementsByClassName( 'side-by-side-multiselect' )[0];

              if ( existingSelect ) {
                  existingSelect.remove();

                  while( channelsSelect.options.length ) {
                      channelsSelect.options.remove( 0 );
                  }
              }

                  channels.forEach( ( channel ) => {
                      const option = document.createElement( 'option' );
              
                      option.value = option.textContent = channel;
              
                      channelsSelect.add( option );
                  } );            
              
                  SideBySideMultiselect( {
                      selector:      '#channels-select',
                      hideCounter:   true,
                      hidefilter:    true,
                      orderOption:   true,
                      labels:        {
                          selected: 'Selected Channels'
                      }
                  } );
              
                  // side-by-side-multiselect seemingly gives no way to assign multiple classes to elements, so we're dynamically adding an extra one here for the gradient outline
                  [].slice.call( document.getElementsByClassName( 'side-by-side-multiselect__inner' ) ).forEach( ( el ) => {
                      el.classList.add( 'gradient-wrapped' );
                  } );
          };

    let savedChannels = preferences.twitch.modChannels;

    // Accounts file normal upload
    dropZone.addEventListener( 'click', ( event ) => {
        window.api.send( 'getAccountsFiles' );
    } );

    // Drag and drop accounts file parser
    document.body.addEventListener( 'drop', ( event ) => {
        event.preventDefault();
        event.stopPropagation();

        const accountsFiles = {
            filePaths: []
        };

        for ( const file of event.dataTransfer.files ) {
            accountsFiles.filePaths.push( file.path );
        };

        window.api.send( 'parseAccountsFiles', accountsFiles );
    } );
    
    document.body.addEventListener( 'dragover', ( event ) => {
        event.preventDefault();
        event.stopPropagation();
    } );

    // Receive parsed uploaded accounts list file from main process
    window.api.receive( 'receiveAccountsList', ( newList ) => {
        let currentList = accountsListTextArea.value.trim();

        if ( currentList ) {
            currentList += '\n';
        }

        accountsListTextArea.value = currentList + newList;

        accountsListTextArea.scrollTop = accountsListTextArea.scrollHeight;
    } );

    // "Select All" button for Channels Selector
    [].slice.call( document.getElementsByClassName( 'channels-selector' ) ).forEach( ( button ) => {
        button.addEventListener( 'click', ( event ) => {
            selectAllChannels( event.target.dataset.menuIndex );
        } );
    } );

    // Enable/disable ban reason text input when Unban switch is toggled
    unbanCB.addEventListener( 'change', ( event ) => {
        if ( event.target.checked ) {
            banReasonContain.classList.add( 'disabled' );
            banReasonInput.disabled = true;
        } else {
            banReasonContain.classList.remove( 'disabled' );
            banReasonInput.disabled = false;
        }
    } );

    // Enable/disable launch button when Confirmation switch is toggled
    confirmCB.addEventListener( 'change', ( event ) => {
        if ( event.target.checked ) {
            launchBtn.disabled = false;
            launchBtn.title    = 'Start the action!';
        } else {
            launchBtn.disabled = true;
            launchBtn.title    = 'Please confirm that you\'re ready first';
        }
    } );

    // Updated available channels if setting is changed
    window.api.receive( 'preferencesUpdated', ( preferences ) => {
        savedChannels = preferences.twitch.modChannels;

        populateChannels( savedChannels );
    } );

    // Collect and transfer form data to main process
    dashboardForm.addEventListener( 'submit', ( event ) => {
        event.preventDefault();

        if ( confirmCB.checked ) {
            const formData     = new FormData( dashboardForm ),
                  accountsList = formData.get( 'accounts-list' ),
                  banReason    = formData.get( 'ban-reason' ),
                  channels     = formData.get( 'channels-order' ),
                  unban        = formData.get( 'unban-action' ) ?? false;

            let details = {
                reason: '',
                action: 'ban'
            };

            if ( accountsList ) {
                details.accounts = accountsList.trim().split( /\r\n|\r|\n/ );
            } else {
                window.api.send( 'rendererError', {
                    title:   'No Accounts Provided',
                    message: 'Please provide at least 1 account to ban/unban.'
                } );

                return;
            }

            if ( banReason ) {
                details.reason = banReason.trim();
            }

            if ( channels.length > 0 ) {
                /**
                 * Returned value always seems to end with a semicolon, so we remove those before
                 * splitting to avoid having an empty orphaned value at the end of the resulting array
                 */
                details.channels = channels.trim().replace( /;$/g, '' ).split( /; ?/ );
            } else {
                window.api.send( 'rendererError', {
                    title:   'No Channels Selected',
                    message: 'Please select at least 1 channel to run this action in.'
                } );

                return;
            }

            if ( unban === 'on' ) {
                details.action = 'unban';
            }

            formContent.disabled = true;
            document.body.classList.add( 'locked' );

            window.api.send( 'runAction', details );

            setTimeout( () => {
                dashboardForm.reset();

                banReasonContain.classList.remove( 'disabled' );
                
                populateChannels( savedChannels );

                banReasonInput.disabled = false;
                launchBtn.disabled      = true;
                formContent.disabled    = false;
            }, 300 );
        }
    } );

    // Unlock dashboard if process ends
    window.api.receive( 'unlockDashboard', () => {
        document.body.classList.remove( 'locked' );
    } );

    populateChannels( savedChannels );
} );
