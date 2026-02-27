const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false });
  // Just load something to execute JS
  win.loadURL('data:text/html,<html><body>Hello</body></html>').then(() => {
    win.webContents.executeJavaScript('localStorage.clear();').then(() => {
        console.log("Local storage cleared.");
        app.quit();
    });
  });
});
