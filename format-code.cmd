@echo off
setlocal
pushd "%~dp0"
set "mouvraNode=node"
where node >nul 2>nul
if errorlevel 1 set "mouvraNode=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%mouvraNode%" node_modules\prettier\bin\prettier.cjs --write .
set "mouvraResult=%errorlevel%"
popd
exit /b %mouvraResult%
