# ================================
# CMD: powershell -ExecutionPolicy Bypass -File create_extension.ps1  ================================
#   Ordnername vom Benutzer abfragen
# ================================
$folder = Read-Host "Gib den Ordnernamen für die Extension ein"

if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Name $folder | Out-Null
    Write-Host "Ordner erstellt: $folder"
} else {
    Write-Host "Ordner existiert bereits: $folder"
}

Set-Location $folder


# ================================
#   DATEILISTE HIER EINFÜGEN
# ================================
$files = @"
manifest.json
background.js
popup.html
popup.js
style.css
icon.png
"@ -split "`n"


# ================================
#   TEMPLATES DEFINIEREN
# ================================
$templates = @{
    "manifest.json" = @"
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Auto‑generierte Chrome Extension",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": []
}
"@

    "background.js" = @"
// Background Script
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});
"@

    "popup.html" = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="style.css">
    <title>Popup</title>
</head>
<body>
    <h1>Popup</h1>
    <button id="btn">Klick mich</button>
    <script src="popup.js"></script>
</body>
</html>
"@

    "popup.js" = @"
// Popup Script
document.getElementById('btn').addEventListener('click', () => {
    alert('Button geklickt');
});
"@

    "style.css" = @"
body {
    font-family: Arial, sans-serif;
    padding: 10px;
}
button {
    padding: 8px 12px;
    cursor: pointer;
}
"@
}


# ================================
#   ICON (BASE64 → PNG)
# ================================
$iconBase64 = @"
iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4Ae3BAQ0AAADCoPdPbQ43oAAAAAAAAAAA
AAAAAAAAAAAAAPgG4QAAZqSeXQAAAABJRU5ErkJggg==
"@


# ================================
#   DATEIEN ERSTELLEN
# ================================
foreach ($file in $files) {
    $file = $file.Trim()
    if ($file -eq "") { continue }

    if ($file -eq "icon.png") {
        [IO.File]::WriteAllBytes("icon.png", [Convert]::FromBase64String($iconBase64))
        Write-Host "Erstellt (Icon): $file"
        continue
    }

    if ($templates.ContainsKey($file)) {
        $templates[$file] | Out-File $file -Encoding utf8
        Write-Host "Erstellt (Template): $file"
    }
    else {
        New-Item -ItemType File -Name $file -Force | Out-Null
        Write-Host "Erstellt (leer): $file"
    }
}