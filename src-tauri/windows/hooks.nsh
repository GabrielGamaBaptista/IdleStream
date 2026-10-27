!macro NSIS_HOOK_POSTINSTALL
  CreateShortcut "$DESKTOP\IdleStream.lnk" "$INSTDIR\idlestream.exe" "" "$INSTDIR\idlestream.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$DESKTOP\IdleStream.lnk"
!macroend
