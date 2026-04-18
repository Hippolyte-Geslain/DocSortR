; NSIS customization for DocSortR installer.
; Offers to clean user data (models, cache) during uninstall.

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Souhaitez-vous également supprimer les modèles et données téléchargés (~4 Go) ?$\r$\n$\r$\nRépondre Non conserve vos paramètres et votre historique." \
    /SD IDNO IDYES deleteUserData IDNO keepUserData
  deleteUserData:
    RMDir /r "$APPDATA\DocSortR"
  keepUserData:
!macroend
