# C:\anki_images

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# $form.Opacity = 0.9
$form = New-Object Windows.Forms.Form
$form.Width = 240
$form.Height = 300
$form.TopMost = $true
$form.FormBorderStyle = "FixedToolWindow"
$form.StartPosition = "Manual"
$form.Location = New-Object Drawing.Point(100, 100)

$pictureBox = New-Object Windows.Forms.PictureBox
$pictureBox.Width = 220
$pictureBox.Height = 220
$pictureBox.Top = 10
$pictureBox.Left = 10
$pictureBox.SizeMode = "Zoom"

$form.Controls.Add($pictureBox)

# Buttons
$btnAgain = New-Object Windows.Forms.Button
$btnAgain.Text = "Again"
$btnAgain.Width = 100
$btnAgain.Top = 240
$btnAgain.Left = 10

$btnEasy = New-Object Windows.Forms.Button
$btnEasy.Text = "Easy"
$btnEasy.Width = 100
$btnEasy.Top = 240
$btnEasy.Left = 120

$form.Controls.Add($btnAgain)
$form.Controls.Add($btnEasy)

# Bilder laden
$images = Get-ChildItem "C:\anki_images" -Include *.jpg, *.png -Recurse

# Lernstatus speichern
$queue = @()
foreach ($img in $images) {
    $queue += [PSCustomObject]@{
        Path     = $img.FullName
        Score    = 0
        NextShow = Get-Date
    }
}

function Get-NextImage {
    $now = Get-Date
    $due = $queue | Where-Object { $_.NextShow -le $now }

    if ($due.Count -eq 0) {
        return Get-Random $queue
    }

    return Get-Random $due
}

$current = $null

function Show-Image {
    $global:current = Get-NextImage
    $pictureBox.Image = [System.Drawing.Image]::FromFile($current.Path)
}

# Button Logik
$btnAgain.Add_Click({
        $current.Score = [Math]::Max(0, $current.Score - 1)
        $current.NextShow = (Get-Date).AddSeconds(10)
        Show-Image
    })

$btnEasy.Add_Click({
        $current.Score++
    
        # je besser, desto länger Pause
        $delay = 10 + ($current.Score * 20)
        $current.NextShow = (Get-Date).AddSeconds($delay)
    
        Show-Image
    })

# Auto-Timer
$timer = New-Object Windows.Forms.Timer
$timer.Interval = 5000

$timer.Add_Tick({
        Show-Image
    })

$timer.Start()

# Show-Image()
$form.ShowDialog()