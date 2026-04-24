; Executado antes da extração dos arquivos — encerra qualquer instância rodando
!macro customInstall
  DetailPrint "Encerrando Clica Aí em execução..."
  nsExec::ExecToLog 'powershell -NonInteractive -WindowStyle Hidden -Command "Stop-Process -Name Clica* -Force -ErrorAction SilentlyContinue"'
  Sleep 2000
!macroend
