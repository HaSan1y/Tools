param(
    [string]$ExecutablePath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
    $candidate = Join-Path $PSScriptRoot "bin\Release\net10.0-windows\Yuck.exe"
    if (Test-Path $candidate) {
        $ExecutablePath = $candidate
    } else {
        $candidate = Join-Path $PSScriptRoot "bin\Debug\net10.0-windows\Yuck.exe"
        if (Test-Path $candidate) {
            $ExecutablePath = $candidate
        }
    }
}

if (-not (Test-Path $ExecutablePath)) {
    throw "Yuck.exe was not found. Build or publish Yuck first, or pass -ExecutablePath `"C:\path\to\Yuck.exe`"."
}

$extensions = ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".txt", ".yucklist"

foreach ($extension in $extensions) {
    $baseKey = "Registry::HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\$extension\shell\AddToYuck"
    $commandKey = Join-Path $baseKey "command"

    New-Item -Path $baseKey -Force | Out-Null
    New-Item -Path $commandKey -Force | Out-Null
    Set-Item -Path $baseKey -Value "Add to Yuck"
    Set-ItemProperty -Path $baseKey -Name "Icon" -Value $ExecutablePath
    Set-Item -Path $commandKey -Value "`"$ExecutablePath`" `"%1`""
}

Write-Host "Installed 'Add to Yuck' for images and Yuck lists."
