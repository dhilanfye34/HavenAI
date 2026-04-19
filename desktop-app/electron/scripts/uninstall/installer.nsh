!macro customUnInstall
  DetailPrint "Running HavenAI cleanup..."
  IfFileExists "$INSTDIR\resources\uninstall\cleanup-windows.ps1" found_cleanup missing_cleanup

found_cleanup:
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\uninstall\cleanup-windows.ps1"'
  Pop $0
  DetailPrint "Cleanup exit code: $0"
  Goto done_cleanup

missing_cleanup:
  DetailPrint "Cleanup script not found, continuing uninstall."
done_cleanup:
!macroend
