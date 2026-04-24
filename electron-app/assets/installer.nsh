; Executado antes da extração dos arquivos — encerra qualquer instância rodando
!macro customInstall
  DetailPrint "Encerrando Clica Aí em execução..."
  ; taskkill /T mata a árvore inteira (inclui Chrome/Chromium filho do puppeteer)
  nsExec::ExecToLog 'taskkill /F /IM "Clica*" /T'
  nsExec::ExecToLog 'powershell -NonInteractive -WindowStyle Hidden -Command "Get-Process | Where-Object { $_.Name -like ''Clica*'' } | Stop-Process -Force -ErrorAction SilentlyContinue"'
  Sleep 5000
!macroend
