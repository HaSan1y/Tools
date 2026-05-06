using System.IO;
using System.Windows;
using System.Windows.Forms;

namespace Yuck
{
    public partial class App : System.Windows.Application
    {
        public NotifyIcon TrayIcon { get; private set; }
        MainWindow? mainWindow;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            TrayIcon = new NotifyIcon();
            TrayIcon.Icon = new System.Drawing.Icon(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets", "yuck.ico"));
            TrayIcon.Visible = true;
            TrayIcon.Text = "Yuck";

            mainWindow = new MainWindow(e.Args);
            MainWindow = mainWindow;
            mainWindow.Show();

            TrayIcon.ContextMenuStrip = new ContextMenuStrip();
            TrayIcon.ContextMenuStrip.Items.Add("Open", null, (s, ev) => ShowMainWindow());
            TrayIcon.ContextMenuStrip.Items.Add("Exit", null, (s, ev) => Shutdown());

            TrayIcon.DoubleClick += (s, ev) => ShowMainWindow();
        }

        void ShowMainWindow()
        {
            if (mainWindow == null)
            {
                mainWindow = new MainWindow();
                MainWindow = mainWindow;
            }

            mainWindow.RestoreFromTray();
            if (!mainWindow.IsVisible)
            {
                mainWindow.Show();
            }
            mainWindow.WindowState = WindowState.Normal;
            mainWindow.Activate();
        }

        protected override void OnExit(ExitEventArgs e)
        {
            TrayIcon.Visible = false;
            TrayIcon.Dispose();
            base.OnExit(e);
        }
    }
}
