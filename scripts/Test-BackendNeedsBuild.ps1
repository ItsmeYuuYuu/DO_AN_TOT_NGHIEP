param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$DllPath
)

if (-not (Test-Path -LiteralPath $DllPath)) {
    exit 1
}

$dllLastWrite = (Get-Item -LiteralPath $DllPath).LastWriteTimeUtc
$newerSource = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File |
    Where-Object {
        ($_.Extension -eq ".cs" -or $_.Extension -eq ".csproj") -and
        $_.FullName -notlike "*\bin\*" -and
        $_.FullName -notlike "*\obj\*" -and
        $_.LastWriteTimeUtc -gt $dllLastWrite
    } |
    Select-Object -First 1

if ($null -ne $newerSource) {
    exit 1
}

exit 0
