$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== ShiftStorm Infra Fix Script ==="
Write-Host ""

# Ensure we're in the infra directory
Set-Location $PSScriptRoot

# AWS region
$env:AWS_REGION = "us-east-2"
$env:AWS_DEFAULT_REGION = "us-east-2"
$env:CDK_DEFAULT_REGION = "us-east-2"

Write-Host "AWS region set to us-east-2"
Write-Host ""

# Create site folder if missing
if (!(Test-Path ".\site")) {
    New-Item -ItemType Directory -Path ".\site" | Out-Null
    Write-Host "Created site folder"
}

# Create default index.html if missing
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

# Clean dist
if (Test-Path ".\dist") {
    Remove-Item ".\dist" -Recurse -Force
    Write-Host "Removed dist folder"
}

Write-Host ""
Write-Host "Building TypeScript..."
npm run build

Write-Host ""
Write-Host "Deploying CDK..."
npm run deploy

Write-Host ""
Write-Host "Done."