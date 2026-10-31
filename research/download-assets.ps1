$assets = Get-Content -Raw -LiteralPath "$PSScriptRoot/assets-initial.json" | ConvertFrom-Json
$assetRoot = Join-Path $PSScriptRoot '../public/images'
$results = foreach ($asset in $assets) {
  try {
    $outputPath = Join-Path $assetRoot $asset.name
    Invoke-WebRequest -Uri $asset.url -OutFile $outputPath -UseBasicParsing
    $file = Get-Item -LiteralPath $outputPath
    [pscustomobject]@{name=$asset.name; url=$asset.url; bytes=$file.Length; status='downloaded'}
  } catch {
    [pscustomobject]@{name=$asset.name; url=$asset.url; bytes=0; status=$_.Exception.Message}
  }
}
$results | ConvertTo-Json | Set-Content -LiteralPath "$PSScriptRoot/asset-downloads.json" -Encoding utf8
$results | Select-Object name,bytes,status
