import { app, BrowserWindow, Menu, shell, ipcMain } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const workspaceDir = process.env.MITSUMORI_WORKSPACE_DIR || '/Users/ks/Documents/90_開発_M1移行予定/電気工事/見積もり作るくん';
const externalDistIndex = path.join(workspaceDir, 'dist/index.html');

function loadApp(window) {
  const isDev = !app.isPackaged;

  if (isDev) {
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools();
    return;
  }

  if (fs.existsSync(externalDistIndex)) {
    window.loadFile(externalDistIndex);
    return;
  }

  window.loadFile(path.join(__dirname, '../dist/index.html'));
}

function buildLatestFrontend() {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', 'build'], {
      cwd: workspaceDir,
      shell: false,
      stdio: 'pipe',
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(output || `npm run build failed with code ${code}`));
    });
  });
}

ipcMain.handle('mitsumori:reload-app', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!focusedWindow) return false;
  focusedWindow.webContents.reloadIgnoringCache();
  return true;
});

ipcMain.handle('mitsumori:update-app', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!focusedWindow) return { ok: false, message: 'アプリ画面が見つかりません。' };

  if (!fs.existsSync(workspaceDir)) {
    return { ok: false, message: `更新元フォルダが見つかりません: ${workspaceDir}` };
  }

  try {
    await buildLatestFrontend();
    loadApp(focusedWindow);
    return { ok: true, message: '最新版へ更新しました。' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
});

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '電工見積もりくん',
  });

  loadApp(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 外部リンクをデフォルトのブラウザで開くようにする
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Macでコピー＆ペーストや全選択などの標準ショートカットを使えるようにするためのメニュー設定
function setAppMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '電工見積もりくん について' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: '非表示' },
        { role: 'hideOthers', label: 'ほかを非表示' },
        { role: 'unhide', label: 'すべて表示' },
        { type: 'separator' },
        { role: 'quit', label: '終了' }
      ]
    }] : []),
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { role: 'toggleDevTools', label: '開発者ツール' },
        { type: 'separator' },
        { role: 'resetZoom', label: '実際のサイズ' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン' }
      ]
    },
    {
      label: 'ウィンドウ',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: 'ズーム' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: '手前に移動' },
          { type: 'separator' },
          { role: 'window', label: 'ウィンドウ' }
        ] : [
          { role: 'close', label: '閉じる' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  setAppMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
