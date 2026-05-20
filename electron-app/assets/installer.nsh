; Executado antes da extração dos arquivos — encerra qualquer instância rodando
; $$ em NSIS = $ literal (necessário para $ do PowerShell não ser tratado como variável NSIS)
!macro customInstall
  DetailPrint "Encerrando Clica Aí em execução..."
  nsExec::ExecToLog 'taskkill /F /IM "Clica*" /T'
  nsExec::ExecToLog 'powershell -NonInteractive -WindowStyle Hidden -Command "Get-Process | Where-Object { $$_.Name -like ''Clica*'' } | Stop-Process -Force -ErrorAction SilentlyContinue"'
  Sleep 2000
!macroend
