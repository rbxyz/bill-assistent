; Hooks customizados do instalador NSIS (electron-builder).
; Objetivo: atualização limpa — instalar uma versão nova remove a anterior
; por completo, preservando apenas o .env configurado pelo usuário.

; Início da instalação: se houver resíduos órfãos da versão antiga (da época
; em que o produto se chamava "Bill"), remove pasta e atalhos manualmente.
; Quando o desinstalador anterior está registrado, o fluxo padrão do
; electron-builder já o executa — nesse caso não tocamos em nada.
!macro customInit
  ReadRegStr $R0 SHCTX "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${if} $R0 == ""
    ${if} ${FileExists} "$LOCALAPPDATA\Programs\Bill"
      RMDir /r "$LOCALAPPDATA\Programs\Bill"
      Delete "$DESKTOP\Bill.lnk"
      Delete "$SMPROGRAMS\Bill.lnk"
    ${endif}
  ${endif}
!macroend

; Remoção de arquivos (roda também na desinstalação silenciosa disparada por
; uma atualização): apaga toda a pasta da versão anterior, guardando antes o
; .env para devolvê-lo à versão nova.
!macro customRemoveFiles
  ${if} ${isUpdated}
    ${if} ${FileExists} "$INSTDIR\.env"
      CopyFiles /SILENT "$INSTDIR\.env" "$APPDATA\bill-cipher-env-root.bak"
    ${endif}
    ${if} ${FileExists} "$INSTDIR\resources\.env"
      CopyFiles /SILENT "$INSTDIR\resources\.env" "$APPDATA\bill-cipher-env-res.bak"
    ${endif}
  ${endif}
  RMDir /r "$INSTDIR"
!macroend

; Fim da instalação: restaura o .env preservado pela atualização.
!macro customInstall
  ${if} ${FileExists} "$APPDATA\bill-cipher-env-root.bak"
    CopyFiles /SILENT "$APPDATA\bill-cipher-env-root.bak" "$INSTDIR\.env"
    Delete "$APPDATA\bill-cipher-env-root.bak"
  ${endif}
  ${if} ${FileExists} "$APPDATA\bill-cipher-env-res.bak"
    CreateDirectory "$INSTDIR\resources"
    CopyFiles /SILENT "$APPDATA\bill-cipher-env-res.bak" "$INSTDIR\resources\.env"
    Delete "$APPDATA\bill-cipher-env-res.bak"
  ${endif}
!macroend
