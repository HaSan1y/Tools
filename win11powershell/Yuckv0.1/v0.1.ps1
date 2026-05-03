Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object Windows.Forms.Form
$form.Width = 220
$form.Height = 220
$form.TopMost = $true

$pictureBox = New-Object Windows.Forms.PictureBox
$pictureBox.Dock = "Fill"
$form.Controls.Add($pictureBox)

$images = Get-ChildItem "C:\anki_images" -Filter *.jpg

$timer = New-Object Windows.Forms.Timer
$timer.Interval = 3000

$timer.Add_Tick({
    $img = Get-Random $images
    $pictureBox.Image = [System.Drawing.Image]::FromFile($img.FullName)
})

$timer.Start()

$form.ShowDialog()