# C:\anki_images

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$imgPath = "C:\anki_images"
$saveFile = "$imgPath\progress.json"

# UI
$form = New-Object Windows.Forms.Form
$form.Width = 260
$form.Height = 320
$form.TopMost = $true
$form.FormBorderStyle = "FixedToolWindow"
$form.KeyPreview = $true

$pictureBox = New-Object Windows.Forms.PictureBox
$pictureBox.Size = New-Object Drawing.Size(240, 220)
$pictureBox.Location = New-Object Drawing.Point(10, 10)
$pictureBox.SizeMode = "Zoom"

$form.Controls.Add($pictureBox)

$btnAgain = New-Object Windows.Forms.Button
$btnAgain.Text = "Again (A)"
$btnAgain.Size = "110,40"
$btnAgain.Location = "10,240"

$btnEasy = New-Object Windows.Forms.Button
$btnEasy.Text = "Easy (E)"
$btnEasy.Size = "110,40"
$btnEasy.Location = "140,240"

$form.Controls.Add($btnAgain)
$form.Controls.Add($btnEasy)

# Daten laden
$images = Get-ChildItem $imgPath -Include *.jpg, *.png -Recurse

if (Test-Path $saveFile) {
    $data = Get-Content $saveFile | ConvertFrom-Json
}
else {
    $data = @()
    foreach ($img in $images) {
        $data += [PSCustomObject]@{
            Path     = $img.FullName
            Ease     = 2.5
            Interval = 10
            Due      = (Get-Date)
        }
    }
}

function Save-Data {
    $data | ConvertTo-Json | Set-Content $saveFile
}

function Get-NextCard {
    $now = Get-Date
    $due = $data | Where-Object { [datetime]$_.Due -le $now }

    if ($due.Count -gt 0) {
        return Get-Random $due
    }
    else {
        return Get-Random $data
    }
}

$current = $null

function Show-Card {
    $global:current = Get-NextCard
    $pictureBox.Image = [System.Drawing.Image]::FromFile($current.Path)
}

# Logik
function Again {
    $current.Interval = 10
    $current.Ease = [Math]::Max(1.3, $current.Ease - 0.2)
    $current.Due = (Get-Date).AddSeconds($current.Interval)
    Save-Data
    Show-Card
}

function Easy {
    $current.Interval = [int]($current.Interval * $current.Ease)
    $current.Ease += 0.1
    $current.Due = (Get-Date).AddSeconds($current.Interval)
    Save-Data
    Show-Card
}

# Events
$btnAgain.Add_Click({ Again })
$btnEasy.Add_Click({ Easy })

$form.Add_KeyDown({
        if ($_.KeyCode -eq "A") { Again }
        if ($_.KeyCode -eq "E") { Easy }
    })

# Timer (Auto Rotation)
$timer = New-Object Windows.Forms.Timer
$timer.Interval = 8000
$timer.Add_Tick({ Show-Card })
$timer.Start()

# Show-Card()

$form.ShowDialog()