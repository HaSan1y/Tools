using System.IO;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Newtonsoft.Json;
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
        List<Card> cards = new();
        Card? current;
        DispatcherTimer timer = new();
        readonly WinForms.NotifyIcon trayIcon;
        bool isReallyClosing;
        bool hideAfterStartupAdd;
        bool isPlaylistSelectionInternal;
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

            trayIcon = ((App)System.Windows.Application.Current).TrayIcon;
            LoadFolder(folder);

            if (startupPaths is { Length: > 0 })
            {
                AddInputs(startupPaths, "startup");
                hideAfterStartupAdd = true;
            }

            timer.Interval = TimeSpan.FromSeconds(8);
            timer.Tick += (s, e) => ShowNext();
            timer.Start();

            KeyDown += OnKey;
            Loaded += OnLoaded;
            this.MouseWheel += Window_MouseWheel;
        }

        void LoadFolder(string path)
        {
            folder = path;
            Directory.CreateDirectory(folder);
            saveFile = Path.Combine(folder, "progress.json");
            listFile = Path.Combine(folder, "images.yucklist");

            var files = Directory.GetFiles(folder)
                .Where(IsImageFile)
                .ToList();

            if (File.Exists(listFile))
            {
                files.AddRange(ReadImageList(listFile));
            }

            if (File.Exists(saveFile))
            {
                var text = File.ReadAllText(saveFile);
                var loaded = JsonConvert.DeserializeObject<List<Card>>(text);
                cards = loaded ?? files.Select(NewCard).ToList();
            }
            else
            {
                cards = files.Select(NewCard).ToList();
            }

            PruneMissingCards("Removed missing images from the list");
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
            SaveData();
            SaveImageList();
        }

        void SaveData()
        {
            if (string.IsNullOrEmpty(saveFile)) return;
            File.WriteAllText(saveFile, JsonConvert.SerializeObject(cards, Formatting.Indented));
        }

        void SaveImageList()
        {
            if (string.IsNullOrEmpty(listFile)) return;

            File.WriteAllLines(listFile, cards.Select(c => c.Path));
        }

        void RefreshPlaylist()
        {
            isPlaylistSelectionInternal = true;
            Playlist.ItemsSource = null;
            Playlist.ItemsSource = cards;
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
                CardImage.Source = null;

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
            var removed = PruneMissingCards();
            zoom = 1.0;
            ImageScale.ScaleX = 1;
            ImageScale.ScaleY = 1;
            if (cards.Count == 0)
            {
                current = null;
                CardImage.Source = null;
                StatusText.Text = removed > 0
                    ? $"Removed {removed} missing image{(removed == 1 ? "" : "s")}"
                    : "Drop images, folders or lists here";
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
            CardImage.BeginAnimation(OpacityProperty, fade);

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
            CardImage.BeginAnimation(OpacityProperty, fade);

            var index = cards.IndexOf(card) + 1;
            StatusText.Text = loadError ?? $"{index}/{cards.Count} | Interval: {current.Interval}s";
            SelectCurrentInPlaylist();
            CardImage.MouseDown += Image_MouseDown;
            CardImage.MouseUp += Image_MouseUp;
            CardImage.MouseMove += Image_MouseMove;
        }

        void SelectCurrentInPlaylist()
        {
            isPlaylistSelectionInternal = true;
            Playlist.SelectedItem = current;
            Playlist.ScrollIntoView(current);
            isPlaylistSelectionInternal = false;
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
                var img = new BitmapImage();
                img.BeginInit();
                img.CacheOption = BitmapCacheOption.OnLoad;
                img.UriSource = new Uri(current.Path);
                img.EndInit();
                img.Freeze();
                CardImage.Source = img;
                return true;
            }
            catch (Exception)
            {
                CardImage.Source = null;
                loadError = $"Cannot load image: {current.Name}";
                return true;
            }
        }

        void RemoveCard(Card card, string statusMessage)
        {
            cards.Remove(card);
            if (ReferenceEquals(card, current))
            {
                current = null;
                CardImage.Source = null;
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

        private void LoadList_Click(object sender, RoutedEventArgs e)
        {
            using var dialog = new WinForms.OpenFileDialog
            {
                Filter = "Yuck lists (*.yucklist;*.txt)|*.yucklist;*.txt|All files (*.*)|*.*",
                Title = "Load image path list"
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
                Filter = "Images (*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp)|*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp|All files (*.*)|*.*",
                Title = "Replace playlist item"
            };

            if (dialog.ShowDialog() != WinForms.DialogResult.OK) return;

            selected.Path = dialog.FileName;
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
            var added = AddImages(files);
            if (added > 0)
            {
                SaveImageList();
                RefreshPlaylist();
                StatusText.Text = $"Added {added} image{(added == 1 ? "" : "s")} from {source}";
                ShowNext();
                return;
            }

            StatusText.Text = "Use images, folders or .txt/.yucklist path lists";
        }

        IEnumerable<string> ExpandInputs(IEnumerable<string> inputs)
        {
            foreach (var input in inputs.Select(NormalizeInputPath).Where(p => !string.IsNullOrWhiteSpace(p)))
            {
                if (Directory.Exists(input))
                {
                    foreach (var file in SafeEnumerateFiles(input).Where(IsImageFile))
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

                if (File.Exists(input) && IsImageFile(input))
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

                if (File.Exists(path) && IsImageFile(path))
                {
                    yield return path;
                }
            }
        }

        int AddImages(IEnumerable<string> files)
        {
            var added = 0;
            foreach (var file in files.Where(IsImageFile))
            {
                if (!File.Exists(file)) continue;

                var target = GetUniqueTargetPath(file);
                if (!Path.GetFullPath(file).Equals(Path.GetFullPath(target), StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        File.Copy(file, target);
                    }
                    catch (IOException)
                    {
                        continue;
                    }
                    catch (UnauthorizedAccessException)
                    {
                        continue;
                    }
                }
                cards.Add(NewCard(target));
                added++;
            }

            if (added > 0)
            {
                SaveData();
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

        static Card NewCard(string path) => new()
        {
            Path = path,
            Ease = 2.5,
            Interval = 10,
            Due = DateTime.Now
        };

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
        public string Name => System.IO.Path.GetFileName(Path);
    }
}
