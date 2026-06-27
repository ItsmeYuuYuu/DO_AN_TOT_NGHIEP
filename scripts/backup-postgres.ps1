param(
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$Database = "ECommerDB",
    [string]$Username = "postgres",
    [string]$OutputDirectory = "Database\backups",
    [string]$PgDumpPath = "",
    [switch]$PlainSql
)

$ErrorActionPreference = "Stop"

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resolvedOutputDirectory = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
    $OutputDirectory
} else {
    Join-Path $workspaceRoot $OutputDirectory
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDirectory | Out-Null

$pgDump = if ([string]::IsNullOrWhiteSpace($PgDumpPath)) {
    $command = Get-Command "pg_dump" -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "Khong tim thay pg_dump. Hay them thu muc bin cua PostgreSQL vao PATH hoac truyen -PgDumpPath."
    }
    $command.Source
} else {
    $PgDumpPath
}

if (-not (Test-Path -LiteralPath $pgDump)) {
    throw "PgDumpPath khong ton tai: $pgDump"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$extension = if ($PlainSql) { "sql" } else { "dump" }
$fileName = "${Database}_${timestamp}.${extension}"
$outputPath = Join-Path $resolvedOutputDirectory $fileName

Write-Host "Dang backup database '$Database' tu ${HostName}:$Port..." -ForegroundColor Cyan
$securePassword = Read-Host "Nhap mat khau PostgreSQL cho user '$Username'" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:PGPASSWORD = $plainPassword

    $format = if ($PlainSql) { "plain" } else { "custom" }
    $args = @(
        "--host", $HostName,
        "--port", $Port,
        "--username", $Username,
        "--dbname", $Database,
        "--format", $format,
        "--file", $outputPath
    )

    if (-not $PlainSql) {
        $args += "--blobs"
    }

    & $pgDump @args
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump that bai voi exit code $LASTEXITCODE"
    }

    Write-Host "Backup thanh cong:" -ForegroundColor Green
    Write-Host $outputPath
} finally {
    $env:PGPASSWORD = $null
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}
