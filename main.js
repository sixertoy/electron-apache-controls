/* eslint
  no-console: 0,
  global-require: 0 */
const sudo = require('sudo-prompt');
const electron = require('electron');
const childprocess = require('child_process');

// application
const { noop, isdarwin, getasset } = require('./system/utils');

const { app, Menu, Tray } = electron;

let tray = null;
let stopitem = null;
let startitem = null;
let contextMenu = null;
// let installitem = null;
// let uninstallitem = null;

const icons = {
  idle: getasset('tray-icon.png'),
  started: getasset('tray-icon_started.png'),
  stopped: getasset('tray-icon_stopped.png'),
};

const serviceFile = '/System/Library/LaunchDaemons/org.apache.httpd.plist';
const commands = {
  sudo: {
    status: ['-k', '$MODE'],
    service: ['$MODE', '-w', serviceFile],
  },
  nosudo: {
    isrunning: 'ps -ax | grep /usr/sbin/httpd',
    isinstalled: 'launchctl list | grep apache',
  },
};

// const isInstalled = () =>
//   new Promise((resolve, reject) => {
//     childprocess.exec(
//       commands.nosudo.isinstalled,
//       (err, stdout, stderr) => {
//         if (stderr) reject(stderr);
//         else resolve(stdout && stdout !== '');
//       },
//       { encoding: 'utf-8' },
//     );
//   });

const isRunning = () =>
  new Promise((resolve, reject) => {
    childprocess.exec(
      // looking for httpd processes
      commands.nosudo.isrunning,
      (err, stdout, stderr) => {
        if (err) {
          // FIXME -> add debug
          process.stdout.write(`Apache isRunning() error: ${stderr}`);
          return reject(stderr);
        }
        let pids = (stdout && stdout.split('\n')) || [];
        // filtering process with grep as a command
        pids = pids.filter(str => str && str.indexOf('grep') < 0);
        return resolve(pids.length > 0);
      },
      { encoding: 'utf-8' },
    );
  });

function stopService () {
  const opts = { icns: getasset('app-icon.png'), name: app.getName(), encoding: 'utf-8' };
  sudo.exec('apachectl -k stop', opts, (err, stdout, stderrr) => {
    if (err) {
      process.stdout.write(`Stop service error: ${stderrr}`);
      return;
    }
    stopitem.visible = false;
    startitem.visible = true;
    tray.setImage(icons.stopped);
  });
}

function startService () {
  const opts = { icns: getasset('app-icon.png'), name: app.getName(), encoding: 'utf-8' };
  sudo.exec('apachectl -k start', opts, (err, stdout, stderrr) => {
    if (err) {
      process.stdout.write(`Start service error: ${stderrr}`);
      return;
    }
    stopitem.visible = true;
    startitem.visible = false;
    tray.setImage(icons.started);
  });
}

// async function installService () {
//   installitem.visible = false;
//   uninstallitem.visible = true;
//   const cp = await sudoer.spawn('launchctl', commands.sudo.service, {
//     encoding: 'utf-8',
//     env: { MODE: 'load' },
//   });
//   cp.on('close', () => {
//     /*
//     cp.output.stdout (Buffer)
//     cp.output.stderr (Buffer)
//     */
//   });
// }

// async function uninstallService () {
//   installitem.visible = true;
//   uninstallitem.visible = false;
//   const cp = await sudoer.spawn('launchctl', commands.sudo.service, {
//     encoding: 'utf-8',
//     env: { MODE: 'unload' },
//   });
//   cp.on('close', () => {
//     /*
//     cp.output.stdout (Buffer)
//     cp.output.stderr (Buffer)
//     */
//   });
// }

function initMenu () {
  stopitem = contextMenu.getMenuItemById('stop-controller');
  startitem = contextMenu.getMenuItemById('start-controller');
  isRunning()
    .then((running) => {
      console.log('running', running);
      stopitem.visible = running;
      startitem.visible = !running;
      tray.setContextMenu(contextMenu);
      tray.setImage(icons[running ? 'started' : 'stopped']);
    })
    .catch(() => {
      stopitem.visible = false;
      startitem.visible = false;
      tray.setContextMenu(contextMenu);
    });
}

// quand l'user click sur l'icone dans le dock
// quand l'utilisateur click sur l'icone de fermeture de fenetre
app.on('window-all-closed', () => (!isdarwin() ? app.quit() : noop));
app.on('ready', () => {
  app.dock.hide();
  // const mainWindow = new BrowserWindow();
  // mainWindow.setSkipTaskbar(true);
  tray = new Tray(icons.idle);
  tray.setToolTip(`${app.getName()} v${app.getVersion()}`);
  contextMenu = Menu.buildFromTemplate([
    {
      enabled: false,
      label: 'Server status',
    },
    {
      visible: false,
      click: stopService,
      label: 'Stop server',
      id: 'stop-controller',
    },
    {
      visible: false,
      click: startService,
      label: 'Start server',
      id: 'start-controller',
    },
    { type: 'separator' },
    { label: `About ${app.getName()}`, role: 'about' },
    { label: `Version ${app.getVersion()}`, enabled: false },
    { type: 'separator' },
    { label: 'Quitter', type: 'normal', role: 'quit' },
  ]);
  tray.setContextMenu(contextMenu);
  initMenu();
});
