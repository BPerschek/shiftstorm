$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== ShiftStorm Infra Fix Script ==="
Write-Host ""

Set-Location $PSScriptRoot

$env:AWS_REGION = "us-east-2"
$env:AWS_DEFAULT_REGION = "us-east-2"
$env:CDK_DEFAULT_REGION = "us-east-2"

Write-Host "AWS region configured"
Write-Host ""

if (!(Test-Path ".\site")) {
    New-Item -ItemType Directory -Path ".\site" | Out-Null
    Write-Host "Created site folder"
}

if (!(Test-Path ".\site\index.html")) {

@"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShiftStorm</title>
</head>
<body>
  <h1>ShiftStorm deployed successfully</h1>
</body>
</html>
"@ | Set-Content ".\site\index.html"

    Write-Host "Created site/index.html"
}

if (Test-Path ".\dist") {
    Remove-Item ".\dist" -Recurse -Force
    Write-Host "Removed dist folder"
}

Write-Host ""
Write-Host "Building..."
npm run build

Write-Host ""
Write-Host "Deploying..."
npm run deploy

Write-Host ""
Write-Host "Finished."
