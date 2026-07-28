[CmdletBinding()]
param(
    [string]$VpsHost = "103.109.187.196",
    [string]$VpsUser = "deploy",
    [string]$SiteUrl = "https://cdt204.io.vn",
    [switch]$KeepArtifacts
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendProject = Join-Path $repoRoot "BackEnd\ECommerceBackend\ECommerceBackend.csproj"
$frontendRoot = Join-Path $repoRoot "FrontEnd"
$remoteDeployScript = Join-Path $PSScriptRoot "vps\deploy-release.sh"
$releaseId = Get-Date -Format "yyyyMMdd-HHmmss"
$target = "$VpsUser@$VpsHost"
$remoteReleaseDir = "/home/$VpsUser/releases/$releaseId"
$workDir = Join-Path ([System.IO.Path]::GetTempPath()) "cuongdienthoai-deploy-$releaseId"
$apiOutput = Join-Path $workDir "api"
$webOutput = Join-Path $workDir "web"
$apiArchive = Join-Path $workDir "api.tar.gz"
$webArchive = Join-Path $workDir "web.tar.gz"

function Invoke-External {
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [Parameter(Mandatory)]
        [string[]]$Arguments,

        [string]$WorkingDirectory
    )

    $previousLocation = Get-Location
    try {
        if ($WorkingDirectory) {
            Set-Location $WorkingDirectory
        }

        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
    }
    finally {
        Set-Location $previousLocation
    }
}

try {
    foreach ($command in @("dotnet", "npm", "tar", "ssh", "scp")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "Required command '$command' was not found in PATH."
        }
    }

    if (-not (Test-Path $backendProject)) {
        throw "Backend project not found: $backendProject"
    }
    if (-not (Test-Path (Join-Path $frontendRoot "package.json"))) {
        throw "Frontend package.json not found: $frontendRoot"
    }
    if (-not (Test-Path $remoteDeployScript)) {
        throw "Remote deploy script not found: $remoteDeployScript"
    }

    New-Item -ItemType Directory -Force $apiOutput, $webOutput | Out-Null

    Write-Host "`n[1/6] Publishing ASP.NET Core API..." -ForegroundColor Cyan
    Invoke-External "dotnet" @(
        "publish",
        $backendProject,
        "--configuration", "Release",
        "--output", $apiOutput,
        "--nologo"
    )

    Write-Host "`n[2/6] Building React frontend..." -ForegroundColor Cyan
    if (-not (Test-Path (Join-Path $frontendRoot "node_modules"))) {
        Invoke-External "npm" @("ci") $frontendRoot
    }
    Invoke-External "npm" @("run", "build") $frontendRoot

    $distDirectory = Join-Path $frontendRoot "dist"
    if (-not (Test-Path (Join-Path $distDirectory "index.html"))) {
        throw "Frontend build did not produce dist/index.html."
    }
    Copy-Item (Join-Path $distDirectory "*") $webOutput -Recurse -Force

    if (-not (Test-Path (Join-Path $apiOutput "ECommerceBackend.dll"))) {
        throw "Backend publish did not produce ECommerceBackend.dll."
    }
    if (-not (Test-Path (Join-Path $webOutput "index.html"))) {
        throw "Frontend package does not contain index.html."
    }

    Write-Host "`n[3/6] Packaging release $releaseId..." -ForegroundColor Cyan
    Invoke-External "tar" @("-czf", $apiArchive, "-C", $apiOutput, ".")
    Invoke-External "tar" @("-czf", $webArchive, "-C", $webOutput, ".")

    Write-Host "`n[4/6] Creating remote release directory..." -ForegroundColor Cyan
    Invoke-External "ssh" @($target, "mkdir -p '$remoteReleaseDir'")

    Write-Host "`n[5/6] Uploading release..." -ForegroundColor Cyan
    Invoke-External "scp" @(
        $apiArchive,
        $webArchive,
        $remoteDeployScript,
        "${target}:$remoteReleaseDir/"
    )

    Write-Host "`n[6/6] Activating release with health check and rollback..." -ForegroundColor Cyan
    $remoteCommand = @(
        "chmod 750 '$remoteReleaseDir/deploy-release.sh' &&",
        "sudo bash '$remoteReleaseDir/deploy-release.sh'",
        "--release-id '$releaseId'",
        "--api-archive '$remoteReleaseDir/api.tar.gz'",
        "--web-archive '$remoteReleaseDir/web.tar.gz'",
        "--site-url '$SiteUrl'"
    ) -join " "

    Invoke-External "ssh" @("-tt", $target, $remoteCommand)

    Write-Host "`nDeployment succeeded: $releaseId" -ForegroundColor Green
    Write-Host "Site: $SiteUrl" -ForegroundColor Green
    Write-Host "The remote upload remains at $remoteReleaseDir for inspection."
    Write-Host "Remove it later with: ssh $target `"rm -rf '$remoteReleaseDir'`""
}
finally {
    if ((Test-Path $workDir) -and -not $KeepArtifacts) {
        Remove-Item $workDir -Recurse -Force
    }
    elseif (Test-Path $workDir) {
        Write-Host "Local deployment artifacts kept at: $workDir" -ForegroundColor Yellow
    }
}
