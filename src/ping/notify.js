function sanitize(s, max = 200) {
  return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/["`]/g, '').slice(0, max);
}

function hasGui(env, platform) {
  if (platform === 'darwin' || platform === 'win32') return true;
  return !!(env && (env.DISPLAY || env.WAYLAND_DISPLAY));
}

function psStr(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

// Tiers at runtime *inside* PowerShell so notify.js stays pure:
// BurntToast (if module present) -> native WinRT toast -> System.Windows.Forms NotifyIcon balloon -> terminal bell.
function windowsScript(title, message) {
  return [
    `$t=${psStr(title)};$m=${psStr(message)};`,
    `try{`,
      `if(Get-Module -ListAvailable -Name BurntToast){Import-Module BurntToast;New-BurntToastNotification -Text $t,$m}`,
      `else{throw 'no-bt'}`,
    `}catch{`,
      `try{`,
        `[void][Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime];`,
        `[void][Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom,ContentType=WindowsRuntime];`,
        `$te=($t -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;');`,
        `$me=($m -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;');`,
        `$x=New-Object Windows.Data.Xml.Dom.XmlDocument;`,
        `$x.LoadXml('<toast><visual><binding template="ToastGeneric"><text>'+$te+'</text><text>'+$me+'</text></binding></visual></toast>');`,
        `$tn=New-Object Windows.UI.Notifications.ToastNotification $x;`,
        `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($tn)`,
      `}catch{`,
        `try{`,
          `Add-Type -AssemblyName System.Windows.Forms;`,
          `Add-Type -AssemblyName System.Drawing;`,
          `$n=New-Object System.Windows.Forms.NotifyIcon;`,
          `$n.Icon=[System.Drawing.SystemIcons]::Information;$n.Visible=$true;`,
          `$n.ShowBalloonTip(5000,$t,$m,[System.Windows.Forms.ToolTipIcon]::Info);`,
          `Start-Sleep -Seconds 6;$n.Dispose()`,
        `}catch{[Console]::Out.Write([char]7)}`,
      `}`,
    `}`,
  ].join('');
}

function notifyCommand(platform, { title, message, sound }) {
  const t = sanitize(title);
  const m = sanitize(message);
  if (platform === 'darwin') {
    const sp = sound ? ' sound name "Ping"' : '';
    return { cmd: 'osascript', args: ['-e', `display notification "${m}" with title "${t}"${sp}`] };
  }
  if (platform === 'win32') {
    return { cmd: 'powershell', args: ['-NoProfile', '-NonInteractive', '-Command', windowsScript(t, m)] };
  }
  return { cmd: 'notify-send', args: [t, m] };
}

module.exports = { notifyCommand, hasGui, sanitize };
