using System.Drawing;
using System.Windows;
using System.Windows.Forms;
using static Syncfusion.Windows.Forms.Tools.NavigationView;

namespace Yuck
{
    public partial class App : System.Windows.Application
    {
        private NotifyIcon trayIcon;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            trayIcon = new NotifyIcon();
            trayIcon.Icon = new System.Drawing.Icon("yuck.ico");
            trayIcon.Visible = true;
            trayIcon.Text = "Yuck";

            trayIcon.ContextMenuStrip = new ContextMenuStrip();
            trayIcon.ContextMenuStrip.Items.Add("Open", null, (s, ev) => new MainWindow().Show());
            trayIcon.ContextMenuStrip.Items.Add("Exit", null, (s, ev) => Shutdown());

            trayIcon.DoubleClick += (s, ev) => new MainWindow().Show();
        }
    }
    public partial class App : System.Windows.Application
    {
        public NotifyIcon TrayIcon { get; private set; }

    }
}
