@echo off
setlocal
pushd "%~dp0"
set "mouvraNode=node"
where node >nul 2>nul
if errorlevel 1 set "mouvraNode=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%mouvraNode%" node_modules\prettier\bin\prettier.cjs --check .
if errorlevel 1 goto failed
"%mouvraNode%" node_modules\stylelint\bin\stylelint.mjs "app/**/*.css" "components/*.css"
if errorlevel 1 goto failed
"%mouvraNode%" node_modules\eslint\bin\eslint.js . --ignore-pattern dist --ignore-pattern .next
if errorlevel 1 goto failed
"%mouvraNode%" node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 goto failed
"%mouvraNode%" --experimental-strip-types --test tests/*.test.ts
if errorlevel 1 goto failed
echo All code checks passed.
popd
exit /b 0
:failed
popd
exit /b 1
