using System.IO;
using System.Windows;
using System.Windows.Forms;

namespace Yuck
{
    public partial class App : System.Windows.Application
    {
        public NotifyIcon TrayIcon { get; private set; }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            TrayIcon = new NotifyIcon();
            TrayIcon.Icon = new System.Drawing.Icon(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets", "yuck.ico"));
            TrayIcon.Visible = true;
            TrayIcon.Text = "Yuck";

            TrayIcon.ContextMenuStrip = new ContextMenuStrip();
            TrayIcon.ContextMenuStrip.Items.Add("Open", null, (s, ev) => new MainWindow().Show());
            TrayIcon.ContextMenuStrip.Items.Add("Exit", null, (s, ev) => Shutdown());

            TrayIcon.DoubleClick += (s, ev) => new MainWindow().Show();
        }
    }
}
