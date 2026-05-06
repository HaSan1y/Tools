[Setup]
AppName=Yuck
AppVersion=1.0
DefaultDirName={pf}\Yuck
DefaultGroupName=Yuck
OutputDir=.
OutputBaseFilename=YuckInstaller
Compression=lzma
SolidCompression=yes

[Files]
Source: "bin\Release\net10.0-windows\win-x64\publish\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Yuck"; Filename: "{app}\Yuck.exe"
Name: "{commondesktop}\Yuck"; Filename: "{app}\Yuck.exe"

[Run]
Filename: "{app}\Yuck.exe"; Description: "Start Yuck"; Flags: nowait postinstall skipifsilent