param(
    [switch]$InstallDependencies,
    [switch]$SkipLint,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendTests = Join-Path $workspaceRoot "BackEnd\ECommerceBackend.IntegrationTests\ECommerceBackend.IntegrationTests.csproj"
$frontendRoot = Join-Path $workspaceRoot "FrontEnd"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Lenh that bai ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

Write-Host "[1/4] Backend integration tests (PostgreSQL tam, tu dong don dep)" -ForegroundColor Cyan
Invoke-CheckedCommand "dotnet" @("test", $backendTests)

Push-Location $frontendRoot
try {
    if ($InstallDependencies) {
        Write-Host "Cai dat frontend dependencies va Chromium..." -ForegroundColor Cyan
        Invoke-CheckedCommand "npm.cmd" @("ci")
        Invoke-CheckedCommand "npx.cmd" @("playwright", "install", "chromium")
    } elseif (-not (Test-Path -LiteralPath (Join-Path $frontendRoot "node_modules"))) {
        throw "Chua co FrontEnd\node_modules. Chay lai voi -InstallDependencies."
    }

    if (-not $SkipLint) {
        Write-Host "[2/4] Frontend lint" -ForegroundColor Cyan
        Invoke-CheckedCommand "npm.cmd" @("run", "lint")
    } else {
        Write-Host "[2/4] Bo qua frontend lint" -ForegroundColor DarkGray
    }

    if (-not $SkipBuild) {
        Write-Host "[3/4] Frontend production build" -ForegroundColor Cyan
        Invoke-CheckedCommand "npm.cmd" @("run", "build")
    } else {
        Write-Host "[3/4] Bo qua frontend build" -ForegroundColor DarkGray
    }

    Write-Host "[4/4] Frontend Playwright E2E" -ForegroundColor Cyan
    Invoke-CheckedCommand "npm.cmd" @("run", "test:e2e")
}
finally {
    Pop-Location
}

Write-Host "Regression hoan tat thanh cong." -ForegroundColor Green
