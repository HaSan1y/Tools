using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using MouseEventArgs = System.Windows.Input.MouseEventArgs;
using Point = System.Windows.Point;
using WinForms = System.Windows.Forms;

namespace Yuck
{

    public partial class MainWindow : Window
    {
        string folder = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
    "Yuck"
);
        string? saveFile;
        string? listFile;
        string? settingsFile;
        string? thumbsFolder;
        List<Card> cards = new();
        Card? current;
        DispatcherTimer timer = new();
        readonly WinForms.NotifyIcon trayIcon;
        bool isReallyClosing;
        bool hideAfterStartupAdd;
        bool isPlaylistSelectionInternal;
        bool isPaused;
        string currentTheme = "Black";
        int nonFatalIssues;
        Point lastPos;
        bool isDragging = false;

        double zoom = 1.0;
        private void Window_MouseWheel(object sender, MouseWheelEventArgs e)
        {
            if (e.Delta > 0)
                zoom += 0.1;
            else
                zoom -= 0.1;

            zoom = Math.Max(0.2, Math.Min(zoom, 5)); // limits

            ImageScale.ScaleX = zoom;
            ImageScale.ScaleY = zoom;
        }
        public MainWindow(string[]? startupPaths = null)
        {
            InitializeComponent();
            Directory.CreateDirectory(folder);
            thumbsFolder = Path.Combine(folder, "thumbs");
            Directory.CreateDirectory(thumbsFolder);
            ApplyTheme(currentTheme);

            trayIcon = ((App)System.Windows.Application.Current).TrayIcon;
            LoadFolder(folder);

            if (startupPaths is { Length: > 0 })
            {
                AddInputs(startupPaths, "startup");
                hideAfterStartupAdd = true;
            }

            timer.Interval = TimeSpan.FromSeconds(8);
            timer.Tick += (s, e) => ShowNext();
            if (!isPaused)
            {
                timer.Start();
            }

            KeyDown += OnKey;
            Loaded += OnLoaded;
            this.MouseWheel += Window_MouseWheel;
            CardImage.MouseDown += Image_MouseDown;
            CardImage.MouseUp += Image_MouseUp;
            CardImage.MouseMove += Image_MouseMove;
            IsVisibleChanged += OnVisibilityChanged;
        }

        void LoadFolder(string path)
        {
            folder = path;
            Directory.CreateDirectory(folder);
            saveFile = Path.Combine(folder, "progress.json");
            listFile = Path.Combine(folder, "images.yucklist");
            settingsFile = Path.Combine(folder, "settings.json");
            thumbsFolder = Path.Combine(folder, "thumbs");
            Directory.CreateDirectory(thumbsFolder);
            EnsurePlaceholderThumbnails();

            LoadSettings();
            ThemeSelector.SelectedIndex = currentTheme.Equals("Pink", StringComparison.OrdinalIgnoreCase)
                ? 1
                : currentTheme.Equals("Neon", StringComparison.OrdinalIgnoreCase) ? 2
                : currentTheme.Equals("Glass", StringComparison.OrdinalIgnoreCase) ? 3 : 0;
            PauseButton.Content = isPaused ? "Resume" : "Pause";

            var files = new List<string>();
            if (!File.Exists(saveFile))
            {
                files.AddRange(Directory.GetFiles(folder).Where(IsSupportedMediaFile));
            }

            if (File.Exists(listFile))
            {
                files.AddRange(ReadImageList(listFile));
            }

            if (File.Exists(saveFile))
            {
                var text = File.ReadAllText(saveFile);
                var loaded = JsonSerializer.Deserialize<List<Card>>(text);
                cards = loaded ?? files.Select(NewCard).ToList();
            }
            else
            {
                cards = files.Select(NewCard).ToList();
            }

            cards = cards
                .Where(c => !string.IsNullOrWhiteSpace(c.Path))
                .GroupBy(c => Path.GetFullPath(c.Path), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();

            PruneMissingCards("Removed missing files from the list");
            AddMissingCards(files);
            SaveImageList();
            RefreshPlaylist();
            ShowNext();
        }

        void AddMissingCards(IEnumerable<string> files)
        {
            var known = cards.Select(c => c.Path).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var file in files.Where(f => !known.Contains(f)))
            {
                cards.Add(NewCard(file));
            }

            foreach (var card in cards)
            {
                card.Kind ??= GetMediaType(card.Path).ToString().ToLowerInvariant();
                card.ThumbnailPath ??= GetThumbnailPathForCard(card.Path);
            }
            SaveData();
            SaveImageList();
        }

        void SaveData()
        {
            if (string.IsNullOrEmpty(saveFile)) return;
            File.WriteAllText(saveFile, JsonSerializer.Serialize(cards, new JsonSerializerOptions { WriteIndented = true }));
            SaveSettings();
        }

        void SaveImageList()
        {
            if (string.IsNullOrEmpty(listFile)) return;

            File.WriteAllLines(listFile, cards.Select(c => c.Path));
        }

        void RefreshPlaylist()
        {
            isPlaylistSelectionInternal = true;
            var currentPath = current?.Path;
            if (!ReferenceEquals(Playlist.ItemsSource, cards))
            {
                Playlist.ItemsSource = cards;
            }
            else
            {
                Playlist.Items.Refresh();
            }

            if (!string.IsNullOrWhiteSpace(currentPath))
            {
                current = cards.FirstOrDefault(c =>
                    string.Equals(c.Path, currentPath, StringComparison.OrdinalIgnoreCase)) ?? current;
            }
            Playlist.SelectedItem = current;
            isPlaylistSelectionInternal = false;
        }

        int PruneMissingCards(string? statusMessage = null)
        {
            var missing = cards.Where(c => !File.Exists(c.Path)).ToList();
            if (missing.Count == 0) return 0;

            foreach (var card in missing)
            {
                cards.Remove(card);
            }

            if (current != null && missing.Contains(current))
            {
                current = null;
                ClearCurrentView();

            }

            SaveData();
            SaveImageList();
            RefreshPlaylist();

            if (!string.IsNullOrWhiteSpace(statusMessage))
            {
                StatusText.Text = $"{statusMessage}: {missing.Count}";
            }

            return missing.Count;
        }

        void ShowNext()
        {
            if (isPaused) return;

            var removed = PruneMissingCards();
            zoom = 1.0;
            ImageScale.ScaleX = 1;
            ImageScale.ScaleY = 1;
            if (cards.Count == 0)
            {
                current = null;
                ClearCurrentView();
                StatusText.Text = removed > 0
                    ? $"Removed {removed} missing file{(removed == 1 ? "" : "s")}"
                    : "Drop media, folders or lists here";
                RefreshPlaylist();
                return;
            }

            var due = cards.Where(c => c.Due <= DateTime.Now).ToList();
            current = due.Count > 0
                ? due[Random.Shared.Next(due.Count)]
                : cards[Random.Shared.Next(cards.Count)];

            if (!TryDisplayCurrentImage(out var loadError))
            {
                ShowNext();
                return;
            }

            var fade = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300));
            GetActiveViewer()?.BeginAnimation(OpacityProperty, fade);

            StatusText.Text = loadError
                ?? (removed > 0
                    ? $"Removed {removed} missing image{(removed == 1 ? "" : "s")} | Due: {due.Count}"
                    : $"Due: {due.Count} | Interval: {current.Interval}s");
            SelectCurrentInPlaylist();
        }

        void ShowCard(Card card)
        {
            if (!File.Exists(card.Path))
            {
                RemoveCard(card, "Removed missing image from list");
                ShowNext();
                return;
            }

            current = card;
            if (!TryDisplayCurrentImage(out var loadError))
            {
                ShowNext();
                return;
            }

            var fade = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(200));
            GetActiveViewer()?.BeginAnimation(OpacityProperty, fade);

            var index = cards.IndexOf(card) + 1;
            StatusText.Text = loadError ?? $"{index}/{cards.Count} | Interval: {current.Interval}s";
            SelectCurrentInPlaylist();
        }

        void SelectCurrentInPlaylist()
        {
            isPlaylistSelectionInternal = true;
            Playlist.SelectedItem = current;
            Playlist.ScrollIntoView(current);
            isPlaylistSelectionInternal = false;
        }

        UIElement? GetActiveViewer()
        {
            if (CardImage.Visibility == Visibility.Visible) return CardImage;
            if (CardVideo.Visibility == Visibility.Visible) return CardVideo;
            if (CardPdf.Visibility == Visibility.Visible) return CardPdf;
            if (CardTextContainer.Visibility == Visibility.Visible) return CardTextContainer;
            return null;
        }

        void ClearCurrentView()
        {
            CardImage.Source = null;
            CardImage.Visibility = Visibility.Collapsed;
            CardVideo.Stop();
            CardVideo.Source = null;
            CardVideo.Visibility = Visibility.Collapsed;
            CardPdf.Visibility = Visibility.Collapsed;
            if (CardPdf.CoreWebView2 != null)
            {
                CardPdf.CoreWebView2.Navigate("about:blank");
            }
            CardText.Text = string.Empty;
            CardTextContainer.Visibility = Visibility.Collapsed;
        }

        bool TryDisplayCurrentImage(out string? loadError)
        {

            loadError = null;
            if (current == null) return false;

            if (!File.Exists(current.Path))
            {
                RemoveCard(current, "Removed missing image from list");
                return false;
            }

            try
            {
                ClearCurrentView();
                switch (GetMediaType(current.Path))
                {
                    case MediaType.Image:
                        {
                            var img = new BitmapImage();
                            img.BeginInit();
                            img.CacheOption = BitmapCacheOption.OnLoad;
                        img.DecodePixelWidth = 1400;
                            img.UriSource = new Uri(current.Path);
                            img.EndInit();
                            img.Freeze();
                            CardImage.Source = img;
                            CardImage.Visibility = Visibility.Visible;
                            break;
                        }
                    case MediaType.Video:
                        CardVideo.Source = new Uri(current.Path);
                        CardVideo.Visibility = Visibility.Visible;
                        CardVideo.Play();
                        break;
                    case MediaType.Text:
                        {
                            var text = File.ReadAllText(current.Path);
                            CardText.Text = text.Length > 5000 ? text[..5000] + "\n\n... (truncated)" : text;
                            CardTextContainer.Visibility = Visibility.Visible;
                            break;
                        }
                    case MediaType.Pdf:
                        _ = ShowPdfAsync(current.Path);
                        CardPdf.Visibility = Visibility.Visible;
                        EnsureThumbnailForCard(current);
                        break;
                    default:
                        loadError = $"Unsupported file type: {current.Name}";
                        break;
                }
                return true;
            }
            catch (Exception)
            {
                ClearCurrentView();
                loadError = $"Cannot load media: {current.Name}";
                return true;
            }
        }

        void RemoveCard(Card card, string statusMessage)
        {
            cards.Remove(card);
            if (ReferenceEquals(card, current))
            {
                current = null;
                ClearCurrentView();
            }

            SaveData();
            SaveImageList();
            RefreshPlaylist();
            StatusText.Text = statusMessage;
        }

        void Again()
        {
            if (current == null) return;
            current.Interval = 10;
            current.Ease = Math.Max(1.3, current.Ease - 0.2);
            current.Due = DateTime.Now.AddSeconds(current.Interval);
            SaveData();
            SaveImageList();
            ShowNext();
        }

        void Good()
        {
            if (current == null) return;
            current.Interval = (int)(current.Interval * 1.5);
            current.Due = DateTime.Now.AddSeconds(current.Interval);
            SaveData();
            SaveImageList();
            ShowNext();
        }

        void Easy()
        {
            if (current == null) return;
            current.Interval = (int)(current.Interval * current.Ease);
            current.Ease += 0.1;
            current.Due = DateTime.Now.AddSeconds(current.Interval);
            SaveData();
            SaveImageList();
            ShowNext();
        }

        void OnKey(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.A) Again();
            if (e.Key == Key.S) Good();
            if (e.Key == Key.D) Easy();
        }

        private void Again_Click(object sender, RoutedEventArgs e) => Again();
        private void Good_Click(object sender, RoutedEventArgs e) => Good();
        private void Easy_Click(object sender, RoutedEventArgs e) => Easy();
        private void OpenFolder_Click(object sender, RoutedEventArgs e) => OpenImageFolder();
        private void OpenCurrent_Click(object sender, RoutedEventArgs e) => OpenCurrent();

        private void LoadList_Click(object sender, RoutedEventArgs e)
        {
            using var dialog = new WinForms.OpenFileDialog
            {
                Filter = "Yuck lists (*.yucklist;*.txt)|*.yucklist;*.txt|All files (*.*)|*.*",
                Title = "Load media path list"
            };

            if (dialog.ShowDialog() == WinForms.DialogResult.OK)
            {
                AddInputs([dialog.FileName], "list");
            }
        }

        private void UpdateItem_Click(object sender, RoutedEventArgs e)
        {
            if (Playlist.SelectedItem is not Card selected) return;

            using var dialog = new WinForms.OpenFileDialog
            {
                Filter = "Supported media (*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp;*.txt;*.pdf;*.mp4;*.webm;*.avi;*.mov)|*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp;*.txt;*.pdf;*.mp4;*.webm;*.avi;*.mov|All files (*.*)|*.*",
                Title = "Replace playlist item"
            };

            if (dialog.ShowDialog() != WinForms.DialogResult.OK) return;
            var previousPath = selected.Path;
            var replacementPath = CopyFileForReplacement(dialog.FileName, previousPath);
            selected.Path = replacementPath;
            selected.Kind = GetMediaType(replacementPath).ToString().ToLowerInvariant();
            selected.Title = null;
            selected.Keywords = null;
            selected.Notes = null;
            selected.ThumbnailPath = GetThumbnailPathForCard(replacementPath);
            InitializeCardAiFields(selected);
            selected.Due = DateTime.Now;
            current = selected;
            SaveData();
            SaveImageList();
            RefreshPlaylist();
            ShowCard(selected);
        }

        private void DeleteItem_Click(object sender, RoutedEventArgs e)
        {
            if (Playlist.SelectedItem is not Card selected) return;

            var wasCurrent = ReferenceEquals(selected, current);
            cards.Remove(selected);
            DeleteManagedFileIfPresent(selected.Path);
            if (wasCurrent)
            {
                current = null;
            }

            SaveData();
            SaveImageList();
            RefreshPlaylist();
            ShowNext();
        }

        private void Playlist_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            if (isPlaylistSelectionInternal) return;
            if (Playlist.SelectedItem is Card selected)
            {
                ShowCard(selected);
            }
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            if (!hideAfterStartupAdd) return;

            Hide();
            trayIcon.ShowBalloonTip(1500, "Added to Yuck", "The image is now in your learning stack.", WinForms.ToolTipIcon.Info);
        }

        private void PauseButton_Click(object sender, RoutedEventArgs e)
        {
            isPaused = !isPaused;
            PauseButton.Content = isPaused ? "Resume" : "Pause";
            if (isPaused)
            {
                timer.Stop();
                StatusText.Text = "Paused auto-rotation";
            }
            else
            {
                timer.Start();
                ShowNext();
            }
            SaveSettings();
        }

        private void ThemeSelector_SelectionChanged(object sender, System.Windows.Controls.SelectionChangedEventArgs e)
        {
            if (ThemeSelector.SelectedItem is not System.Windows.Controls.ComboBoxItem item) return;
            var themeName = item.Content?.ToString();
            if (string.IsNullOrWhiteSpace(themeName)) return;
            currentTheme = themeName;
            ApplyTheme(currentTheme);
            SaveSettings();
        }

        private void Window_DragOver(object sender, System.Windows.DragEventArgs e)
        {
            e.Effects = e.Data.GetDataPresent(System.Windows.DataFormats.FileDrop)
                ? System.Windows.DragDropEffects.Copy
                : System.Windows.DragDropEffects.None;
            e.Handled = true;
        }

        private void Window_Drop(object sender, System.Windows.DragEventArgs e)
        {
            if (e.Data.GetData(System.Windows.DataFormats.FileDrop) is not string[] files) return;

            AddInputs(files, "drop");
        }

        void AddInputs(IEnumerable<string> inputs, string source)
        {
            var files = ExpandInputs(inputs).ToList();
            var added = AddMedia(files);
            if (added > 0)
            {
                SaveImageList();
                RefreshPlaylist();
                StatusText.Text = $"Added {added} file{(added == 1 ? "" : "s")} from {source}";
                ShowNext();
                return;
            }

            StatusText.Text = "Use media files, folders or .txt/.yucklist path lists";
        }

        IEnumerable<string> ExpandInputs(IEnumerable<string> inputs)
        {
            foreach (var input in inputs.Select(NormalizeInputPath).Where(p => !string.IsNullOrWhiteSpace(p)))
            {
                if (Directory.Exists(input))
                {
                    foreach (var file in SafeEnumerateFiles(input).Where(IsSupportedMediaFile))
                    {
                        yield return file;
                    }
                    continue;
                }

                if (File.Exists(input) && IsListFile(input))
                {
                    foreach (var file in ReadImageList(input))
                    {
                        yield return file;
                    }
                    continue;
                }

                if (File.Exists(input) && IsSupportedMediaFile(input))
                {
                    yield return input;
                }
            }
        }

        IEnumerable<string> ReadImageList(string listPath)
        {
            var listFolder = Path.GetDirectoryName(listPath) ?? Environment.CurrentDirectory;
            foreach (var line in File.ReadLines(listPath))
            {
                var path = NormalizeInputPath(line);
                if (string.IsNullOrWhiteSpace(path) || path.StartsWith('#')) continue;

                if (!Path.IsPathRooted(path))
                {
                    path = Path.Combine(listFolder, path);
                }

                if (File.Exists(path) && IsSupportedMediaFile(path))
                {
                    yield return path;
                }
            }
        }

        int AddMedia(IEnumerable<string> files)
        {
            var added = 0;
            var skipped = 0;
            var known = cards.Select(c => c.Path).ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var file in files.Where(IsSupportedMediaFile))
            {
                if (!File.Exists(file)) continue;

                string target;
                try
                {
                    target = CopyIntoManagedStorage(file);
                }
                catch (Exception ex)
                {
                    skipped++;
                    ReportNonFatal($"Could not import {Path.GetFileName(file)}", ex);
                    continue;
                }
                if (known.Contains(target)) continue;

                cards.Add(NewCard(target));
                EnsureThumbnailForCard(cards[^1]);
                known.Add(target);
                added++;
            }

            if (added > 0)
            {
                SaveData();
            }
            if (skipped > 0)
            {
                StatusText.Text = $"Added {added}, skipped {skipped} file{(skipped == 1 ? "" : "s")} (see status)";
            }

            return added;
        }

        static string NormalizeInputPath(string path)
        {
            return path.Trim().Trim('"');
        }

        static IEnumerable<string> SafeEnumerateFiles(string path)
        {
            try
            {
                return Directory.EnumerateFiles(path);
            }
            catch (IOException)
            {
                return [];
            }
            catch (UnauthorizedAccessException)
            {
                return [];
            }
        }

        string GetUniqueTargetPath(string sourcePath)
        {
            var fileName = Path.GetFileName(sourcePath);
            var target = Path.Combine(folder, fileName);
            var name = Path.GetFileNameWithoutExtension(fileName);
            var extension = Path.GetExtension(fileName);
            var index = 1;

            while (File.Exists(target))
            {
                target = Path.Combine(folder, $"{name}-{index}{extension}");
                index++;
            }

            return target;
        }

        string CopyIntoManagedStorage(string sourcePath)
        {
            var target = GetUniqueTargetPath(sourcePath);
            if (Path.GetFullPath(sourcePath).Equals(Path.GetFullPath(target), StringComparison.OrdinalIgnoreCase))
            {
                return sourcePath;
            }

            File.Copy(sourcePath, target);
            return target;
        }

        string CopyFileForReplacement(string sourcePath, string existingPath)
        {
            var existingFull = Path.GetFullPath(existingPath);
            var sourceFull = Path.GetFullPath(sourcePath);
            if (sourceFull.Equals(existingFull, StringComparison.OrdinalIgnoreCase))
            {
                return existingPath;
            }

            var extension = Path.GetExtension(sourcePath);
            if (Path.GetExtension(existingPath).Equals(extension, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    File.Copy(sourcePath, existingPath, overwrite: true);
                    return existingPath;
                }
                catch (IOException)
                {
                    // fallback to creating a new managed copy
                }
                catch (UnauthorizedAccessException)
                {
                    // fallback to creating a new managed copy
                }
            }

            var managed = CopyIntoManagedStorage(sourcePath);
            DeleteManagedFileIfPresent(existingPath);
            return managed;
        }

        void DeleteManagedFileIfPresent(string path)
        {
            if (!path.StartsWith(folder, StringComparison.OrdinalIgnoreCase) || !File.Exists(path))
            {
                return;
            }

            try
            {
                File.Delete(path);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }

        Card NewCard(string path) => new()
        {
            Path = path,
            Ease = 2.5,
            Interval = 10,
            Due = DateTime.Now,
            Kind = GetMediaType(path).ToString().ToLowerInvariant(),
            ThumbnailPath = GetThumbnailPathForCard(path)
        };

        string? GetThumbnailPathForCard(string path)
        {
            var type = GetMediaType(path);
            if (type == MediaType.Image)
            {
                return path;
            }

            if (string.IsNullOrWhiteSpace(thumbsFolder))
            {
                return null;
            }

            var fallback = Path.Combine(thumbsFolder, $"placeholder-{type.ToString().ToLowerInvariant()}.png");
            return File.Exists(fallback) ? fallback : null;
        }

        static bool IsImageFile(string path)
        {
            var extension = Path.GetExtension(path);
            return extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".gif", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".bmp", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".webp", StringComparison.OrdinalIgnoreCase);
        }

        static bool IsVideoFile(string path)
        {
            var extension = Path.GetExtension(path);
            return extension.Equals(".mp4", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".webm", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".avi", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".mov", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".mkv", StringComparison.OrdinalIgnoreCase);
        }

        static bool IsTextFile(string path)
        {
            var extension = Path.GetExtension(path);
            return extension.Equals(".txt", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".md", StringComparison.OrdinalIgnoreCase);
        }

        static bool IsPdfFile(string path)
        {
            var extension = Path.GetExtension(path);
            return extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase);
        }

        static bool IsSupportedMediaFile(string path)
        {
            return IsImageFile(path) || IsVideoFile(path) || IsTextFile(path) || IsPdfFile(path);
        }

        static MediaType GetMediaType(string path)
        {
            if (IsImageFile(path)) return MediaType.Image;
            if (IsVideoFile(path)) return MediaType.Video;
            if (IsTextFile(path)) return MediaType.Text;
            if (IsPdfFile(path)) return MediaType.Pdf;
            return MediaType.Unknown;
        }

        static bool IsListFile(string path)
        {
            var extension = Path.GetExtension(path);
            return extension.Equals(".txt", StringComparison.OrdinalIgnoreCase)
                || extension.Equals(".yucklist", StringComparison.OrdinalIgnoreCase);
        }

        void OpenImageFolder()
        {
            Directory.CreateDirectory(folder);
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = folder,
                UseShellExecute = true
            });
        }
        private void Window_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            if (isReallyClosing) return;

            e.Cancel = true;
            Hide();
            //trayIcon.ShowBalloonTip(2000, "Yuck is still running", "Drop images, folders or lists onto the window.", WinForms.ToolTipIcon.Info);
        }

        private void Exit_Click(object sender, RoutedEventArgs e)
        {
            isReallyClosing = true;
            Close();
        }

        private void AiInit_Click(object sender, RoutedEventArgs e)
        {
            var updated = 0;
            foreach (var card in cards)
            {
                if (InitializeCardAiFields(card))
                {
                    updated++;
                }
            }

            SaveData();
            RefreshPlaylist();
            StatusText.Text = updated > 0
                ? $"AI init complete for {updated} card{(updated == 1 ? "" : "s")}"
                : "AI init found nothing new";
        }

        private async void AiAnalyze_Click(object sender, RoutedEventArgs e)
        {
            if (current == null)
            {
                StatusText.Text = "Select a card first.";
                return;
            }

            StatusText.Text = "AI analyzing current card...";
            var prompt = BuildCardPrompt(current);
            var analyzed = await TryAnalyzeWithOpenAiAsync(current, prompt);
            if (!analyzed)
            {
                analyzed = await TryAnalyzeWithLocalOnnxRunnerAsync(current, prompt);
            }

            if (analyzed)
            {
                SaveData();
                RefreshPlaylist();
                StatusText.Text = $"AI metadata updated: {current.DisplayLabel}";
                return;
            }

            if (InitializeCardAiFields(current))
            {
                SaveData();
                RefreshPlaylist();
                StatusText.Text = "AI fallback applied (local heuristic).";
            }
            else
            {
                StatusText.Text = "AI analyze unavailable. Set YUCK_OPENAI_API_KEY or YUCK_ONNX_RUNNER.";
            }
        }

        async Task<bool> TryAnalyzeWithOpenAiAsync(Card card, string prompt)
        {
            var apiKey = Environment.GetEnvironmentVariable("YUCK_OPENAI_API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return false;
            }

            try
            {
                using var http = new HttpClient();
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                var payload = new
                {
                    model = "gpt-4o-mini",
                    messages = new object[]
                    {
                        new { role = "system", content = "You generate concise flashcard metadata. Return ONLY JSON with title,keywords,summary." },
                        new { role = "user", content = prompt }
                    },
                    response_format = new { type = "json_object" }
                };

                var body = System.Text.Json.JsonSerializer.Serialize(payload);
                var contentBody = new StringContent(body, Encoding.UTF8);
                contentBody.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                using var response = await http.PostAsync(
                    "https://api.openai.com/v1/chat/completions",
                    contentBody);
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(result);
                var content = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();

                if (string.IsNullOrWhiteSpace(content))
                {
                    return false;
                }

                using var aiDoc = JsonDocument.Parse(content);
                if (aiDoc.RootElement.TryGetProperty("title", out var title))
                {
                    card.Title = title.GetString();
                }
                if (aiDoc.RootElement.TryGetProperty("keywords", out var keywords))
                {
                    card.Keywords = keywords.GetString();
                }
                if (aiDoc.RootElement.TryGetProperty("summary", out var summary))
                {
                    card.Notes = summary.GetString();
                }
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        async Task<bool> TryAnalyzeWithLocalOnnxRunnerAsync(Card card, string prompt)
        {
            var runner = Environment.GetEnvironmentVariable("YUCK_ONNX_RUNNER");
            if (string.IsNullOrWhiteSpace(runner) || !File.Exists(runner))
            {
                return false;
            }

            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = runner,
                    Arguments = "--json",
                    RedirectStandardInput = true,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = System.Diagnostics.Process.Start(psi);
                if (process == null) return false;
                await process.StandardInput.WriteAsync(prompt);
                process.StandardInput.Close();

                var output = await process.StandardOutput.ReadToEndAsync();
                await process.WaitForExitAsync();
                if (process.ExitCode != 0 || string.IsNullOrWhiteSpace(output))
                {
                    return false;
                }

                using var aiDoc = JsonDocument.Parse(output);
                if (aiDoc.RootElement.TryGetProperty("title", out var title))
                {
                    card.Title = title.GetString();
                }
                if (aiDoc.RootElement.TryGetProperty("keywords", out var keywords))
                {
                    card.Keywords = keywords.GetString();
                }
                if (aiDoc.RootElement.TryGetProperty("summary", out var summary))
                {
                    card.Notes = summary.GetString();
                }
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        bool InitializeCardAiFields(Card card)
        {
            var changed = false;
            var filename = Path.GetFileNameWithoutExtension(card.Path);
            var normalized = Regex.Replace(filename, @"[_\-]+", " ").Trim();
            var title = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(normalized.ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(card.Title))
            {
                card.Title = title;
                changed = true;
            }

            if (string.IsNullOrWhiteSpace(card.Keywords))
            {
                var words = Regex.Split(normalized.ToLowerInvariant(), @"\W+")
                    .Where(w => w.Length >= 3)
                    .Distinct()
                    .Take(8)
                    .ToList();
                words.Add(GetMediaType(card.Path).ToString().ToLowerInvariant());
                card.Keywords = string.Join(", ", words.Distinct());
                changed = true;
            }

            if (GetMediaType(card.Path) == MediaType.Text && string.IsNullOrWhiteSpace(card.Notes))
            {
                try
                {
                    var preview = File.ReadAllText(card.Path);
                    if (!string.IsNullOrWhiteSpace(preview))
                    {
                        card.Notes = preview.Length > 160 ? preview[..160] + "..." : preview;
                        changed = true;
                    }
                }
                catch (IOException)
                {
                }
            }

            return changed;
        }

        void OpenCurrent()
        {
            if (current == null || !File.Exists(current.Path)) return;

            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = current.Path,
                UseShellExecute = true
            });
        }

        string BuildCardPrompt(Card card)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"FileName: {card.Name}");
            sb.AppendLine($"MediaType: {GetMediaType(card.Path)}");
            sb.AppendLine("Generate:");
            sb.AppendLine("- title: short study title");
            sb.AppendLine("- keywords: comma-separated tags");
            sb.AppendLine("- summary: 1-2 sentence study note");

            if (GetMediaType(card.Path) == MediaType.Text)
            {
                try
                {
                    var text = ReadTextPreview(card.Path, 1800);
                    sb.AppendLine("TextPreview:");
                    sb.AppendLine(text);
                }
                catch (IOException)
                {
                }
            }
            return sb.ToString();
        }

        static string ReadTextPreview(string path, int maxChars)
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
            var buffer = new char[maxChars];
            var read = reader.ReadBlock(buffer, 0, buffer.Length);
            return new string(buffer, 0, read);
        }

        async Task ShowPdfAsync(string pdfPath)
        {
            try
            {
                await CardPdf.EnsureCoreWebView2Async();
                CardPdf.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                CardPdf.CoreWebView2.Settings.AreDevToolsEnabled = false;
                CardPdf.Source = new Uri(pdfPath);
                if (current != null && string.Equals(current.Path, pdfPath, StringComparison.OrdinalIgnoreCase))
                {
                    _ = EnsurePdfThumbnailAsync(current, pdfPath);
                }
            }
            catch (Exception)
            {
                CardPdf.Visibility = Visibility.Collapsed;
                CardText.Text = $"Cannot render PDF inline: {Path.GetFileName(pdfPath)}\nUse Open to view in external app.";
                CardTextContainer.Visibility = Visibility.Visible;
            }
        }

        public void RestoreFromTray()
        {
            RefreshFromDisk();
            if (current != null)
            {
                ShowCard(current);
            }
            else
            {
                ShowNext();
            }
        }

        void RefreshFromDisk()
        {
            if (string.IsNullOrEmpty(saveFile) || !File.Exists(saveFile)) return;
            try
            {
                var text = File.ReadAllText(saveFile);
                var loaded = JsonSerializer.Deserialize<List<Card>>(text, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true });
                if (loaded == null) return;
                cards = loaded
                    .Where(c => !string.IsNullOrWhiteSpace(c.Path))
                    .GroupBy(c => Path.GetFullPath(c.Path), StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .ToList();
                foreach (var card in cards)
                {
                    card.Kind ??= GetMediaType(card.Path).ToString().ToLowerInvariant();
                    card.ThumbnailPath ??= GetThumbnailPathForCard(card.Path);
                }
                PruneMissingCards();
                RefreshPlaylist();
            }
            catch (IOException)
            {
            }
            catch (System.Text.Json.JsonException)
            {
            }
        }

        async Task EnsurePdfThumbnailAsync(Card card, string pdfPath)
        {
            if (string.IsNullOrEmpty(thumbsFolder)) return;
            var thumbPath = Path.Combine(thumbsFolder, $"{Path.GetFileNameWithoutExtension(pdfPath)}.png");
            if (File.Exists(thumbPath))
            {
                card.ThumbnailPath = thumbPath;
                return;
            }

            try
            {
                await Task.Delay(350);
                var width = Math.Max(420, (int)CardPdf.ActualWidth);
                var height = Math.Max(320, (int)CardPdf.ActualHeight);
                var rtb = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
                rtb.Render(CardPdf);
                var encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(rtb));
                await using var fs = new FileStream(thumbPath, FileMode.Create, FileAccess.Write, FileShare.None);
                encoder.Save(fs);
                card.ThumbnailPath = thumbPath;
                SaveData();
                RefreshPlaylist();
            }
            catch (Exception)
            {
            }
        }

        void EnsureThumbnailForCard(Card card)
        {
            if (GetMediaType(card.Path) != MediaType.Pdf) return;
            if (!string.IsNullOrWhiteSpace(card.ThumbnailPath) && File.Exists(card.ThumbnailPath)) return;
            _ = EnsurePdfThumbnailAsync(card, card.Path);
        }

        void OnVisibilityChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if (IsVisible)
            {
                if (!isPaused)
                {
                    timer.Start();
                }
                return;
            }

            timer.Stop();
            CardVideo.Stop();
            CardVideo.Source = null;
            if (CardPdf.CoreWebView2 != null)
            {
                CardPdf.CoreWebView2.Navigate("about:blank");
            }
        }

        void ApplyTheme(string themeName)
        {
            if (themeName.Equals("Pink", StringComparison.OrdinalIgnoreCase))
            {
                SetThemeColors(
                    "#1C0F1C",
                    "#B0221430",
                    "#2C1C30",
                    "#67426B",
                    "#FFE4FA",
                    "#E2A7D5",
                    "#5C2F5A",
                    "#8E5B8D");
                return;
            }

            if (themeName.Equals("Neon", StringComparison.OrdinalIgnoreCase))
            {
                SetThemeColors(
                    "#0A1012",
                    "#B00E1A1E",
                    "#111C21",
                    "#1F5A5F",
                    "#D9FFF8",
                    "#7EE3D2",
                    "#0F3C42",
                    "#1B7B85");
                return;
            }

            if (themeName.Equals("Glass", StringComparison.OrdinalIgnoreCase))
            {
                SetThemeColors(
                    "#0E121A",
                    "#901B2430",
                    "#202A38",
                    "#4A5C74",
                    "#EEF5FF",
                    "#B4C8E3",
                    "#2F3E56",
                    "#617A9E");
                return;
            }

            SetThemeColors(
                "#111319",
                "#B011141D",
                "#1A2230",
                "#303C52",
                "#DCE7FF",
                "#9BB0D1",
                "#2A3142",
                "#3A455D");
        }

        void SetThemeColors(
            string appBg,
            string cardBg,
            string panelBg,
            string panelBorder,
            string primaryText,
            string secondaryText,
            string buttonBg,
            string buttonBorder)
        {
            Resources["AppBgBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(appBg);
            Resources["CardBgBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(cardBg);
            Resources["PanelBgBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(panelBg);
            Resources["PanelBorderBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(panelBorder);
            Resources["PrimaryTextBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(primaryText);
            Resources["SecondaryTextBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(secondaryText);
            Resources["ButtonBgBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(buttonBg);
            Resources["ButtonBorderBrush"] = (SolidColorBrush)new BrushConverter().ConvertFromString(buttonBorder);
            Background = (SolidColorBrush)Resources["AppBgBrush"];
        }

        void LoadSettings()
        {
            if (string.IsNullOrWhiteSpace(settingsFile) || !File.Exists(settingsFile)) return;
            try
            {
                var text = File.ReadAllText(settingsFile);
                var settings = JsonSerializer.Deserialize<AppSettings>(text);
                if (settings == null) return;
                currentTheme = string.IsNullOrWhiteSpace(settings.Theme) ? "Black" : settings.Theme;
                isPaused = settings.IsPaused;
                ApplyTheme(currentTheme);
            }
            catch (IOException)
            {
                ReportNonFatal("Could not read settings", null);
            }
            catch (JsonException)
            {
                ReportNonFatal("Settings file was invalid and was ignored", null);
            }
        }

        void SaveSettings()
        {
            if (string.IsNullOrWhiteSpace(settingsFile)) return;
            try
            {
                var settings = new AppSettings
                {
                    Theme = currentTheme,
                    IsPaused = isPaused
                };
                File.WriteAllText(settingsFile, JsonSerializer.Serialize(settings, new JsonSerializerOptions
                {
                    WriteIndented = true
                }));
            }
            catch (IOException)
            {
                ReportNonFatal("Could not save settings", null);
            }
            catch (UnauthorizedAccessException)
            {
                ReportNonFatal("No permission to save settings", null);
            }
        }

        void EnsurePlaceholderThumbnails()
        {
            if (string.IsNullOrWhiteSpace(thumbsFolder)) return;
            CreatePlaceholderThumbnail(MediaType.Video, "VIDEO", "#2F4369");
            CreatePlaceholderThumbnail(MediaType.Text, "TEXT", "#4D3D78");
            CreatePlaceholderThumbnail(MediaType.Pdf, "PDF", "#7A2D3A");
            CreatePlaceholderThumbnail(MediaType.Unknown, "FILE", "#4C5969");
        }

        void CreatePlaceholderThumbnail(MediaType type, string label, string accentColor)
        {
            if (string.IsNullOrWhiteSpace(thumbsFolder)) return;
            var target = Path.Combine(thumbsFolder, $"placeholder-{type.ToString().ToLowerInvariant()}.png");
            if (File.Exists(target)) return;

            try
            {
                const int width = 128;
                const int height = 128;
                var visual = new DrawingVisual();
                using var dc = visual.RenderOpen();
                dc.DrawRectangle((SolidColorBrush)new BrushConverter().ConvertFromString("#233047"), null, new Rect(0, 0, width, height));
                dc.DrawRoundedRectangle((SolidColorBrush)new BrushConverter().ConvertFromString(accentColor), null, new Rect(12, 12, 104, 104), 14, 14);
                var text = new FormattedText(
                    label,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Windows.FlowDirection.LeftToRight,
                    new Typeface("Segoe UI Bold"),
                    24,
                    System.Windows.Media.Brushes.White,
                    1.0);
                dc.DrawText(text, new Point((width - text.Width) / 2, (height - text.Height) / 2));

                var rtb = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
                rtb.Render(visual);
                var encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(rtb));
                using var fs = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None);
                encoder.Save(fs);
            }
            catch (Exception ex)
            {
                ReportNonFatal("Could not create placeholder thumbnails", ex);
            }
        }

        void ReportNonFatal(string message, Exception? ex)
        {
            nonFatalIssues++;
            StatusText.Text = ex == null
                ? $"{message} (issue {nonFatalIssues})"
                : $"{message}: {ex.Message} (issue {nonFatalIssues})";
        }


        private void Image_MouseDown(object sender, MouseButtonEventArgs e)
        {
            isDragging = true;
            lastPos = e.GetPosition(this);
            Mouse.Capture((IInputElement)sender);
        }

        private void Image_MouseUp(object sender, MouseButtonEventArgs e)
        {
            isDragging = false;
            Mouse.Capture(null);
        }

        private void Image_MouseMove(object sender, MouseEventArgs e)
        {
            if (!isDragging) return;

            var pos = e.GetPosition(this);
            var dx = pos.X - lastPos.X;
            var dy = pos.Y - lastPos.Y;

            ImageTranslate.X += dx;
            ImageTranslate.Y += dy;

            lastPos = pos;
        }
    }

    public class Card
    {
        public required string Path { get; set; }
        public double Ease { get; set; }
        public int Interval { get; set; }
        public DateTime Due { get; set; }
        public string? Kind { get; set; }
        public string? Title { get; set; }
        public string? Keywords { get; set; }
        public string? Notes { get; set; }
        public string? ThumbnailPath { get; set; }
        public string Name => System.IO.Path.GetFileName(Path);
        public string DisplayLabel
            => string.IsNullOrWhiteSpace(Title) ? Name : $"{Title} ({Name})";
    }

    enum MediaType
    {
        Unknown,
        Image,
        Video,
        Text,
        Pdf
    }

    class AppSettings
    {
        public string Theme { get; set; } = "Black";
        public bool IsPaused { get; set; }
    }
}
