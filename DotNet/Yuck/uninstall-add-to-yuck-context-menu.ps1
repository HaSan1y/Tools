$ErrorActionPreference = "Stop"

$extensions = ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".txt", ".yucklist"

foreach ($extension in $extensions) {
    $baseKey = "Registry::HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\$extension\shell\AddToYuck"
    if (Test-Path $baseKey) {
        Remove-Item -Path $baseKey -Recurse -Force
    }
}

Write-Host "Removed 'Add to Yuck' context menu entries."
