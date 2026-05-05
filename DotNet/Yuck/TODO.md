# Yuck Fix TODO

- [x] 1. Edit Yuck.csproj: Remove duplicate <ApplicationIcon> and unused Syncfusion package
- [x] 2. Edit App.xaml.cs: Use absolute path for icon, cleanup usings
- [x] 3. Edit MainWindow.xaml.cs: Set isReallyClosing = true in Window_Closing (added Exit_Click handler)
- [x] 4. cd DotNet/Yuck && dotnet clean && dotnet build (succeeded, using .NET 10 preview)
- [x] 5. cd DotNet/Yuck && dotnet run --project Yuck.csproj (succeeded; normal MSB3026 lock warning when re-running before full exit - kill process if needed via Task Manager "Yuck.exe")
- [x] 6. Verify: No crash on startup (tray icon "Yuck" appears), right-click Exit closes cleanly. App functional for image flashcards/SRS.

Current progress: TODO created.
