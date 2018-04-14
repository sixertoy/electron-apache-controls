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
let statuslabel = null;
let restartitem = null;
// let installitem = null;
// let uninstallitem = null;

const icons = {
  idle: getasset('tray-icon.png'),
  started: getasset('tray-icon_started.png'),
  stopped: getasset('tray-icon_stopped.png'),
};

// const serviceFile = '/System/Library/LaunchDaemons/org.apache.httpd.plist';
const commands = {
  sudo: {
    stop: 'apachectl -k stop',
    start: 'apachectl -k start',
    restart: 'apachectl -k restart',
    // install: `launchctl load -w ${serviceFile}`,
    // uninstall: `launchctl unload -w ${serviceFile}`,
  },
  nosudo: {
    isrunning: 'ps -ax | grep /usr/sbin/httpd',
    // isinstalled: 'launchctl list | grep apache',
  },
};

const states = {
  stopped: () => {
    stopitem.visible = false;
    startitem.visible = true;
    restartitem.enabled = false;
    tray.setImage(icons.stopped);
  },

  started: () => {
    stopitem.visible = true;
    startitem.visible = false;
    restartitem.enabled = true;
    tray.setImage(icons.started);
  },

  idleing: () => {
    stopitem.visible = false;
    startitem.visible = false;
    restartitem.enabled = false;
    tray.setImage(icons.idle);
  },

  errored: () => {
    stopitem.visible = false;
    startitem.visible = false;
    restartitem.enabled = false;
    tray.setImage(icons.idle);
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

function stopService () {
  const opts = {
    encoding: 'utf-8',
    name: app.getName(),
    icns: getasset('app-icon.png'),
  };
  states.idleing();
  sudo.exec(commands.sudo.stop, opts, (err, stdout, stderrr) => {
    if (err) {
      process.stdout.write(`Stop service error: ${stderrr}`);
      return;
    }
    states.stopped();
  });
}

function startService () {
  const opts = {
    encoding: 'utf-8',
    name: app.getName(),
    icns: getasset('app-icon.png'),
  };
  states.idleing();
  sudo.exec(commands.sudo.start, opts, (err, stdout, stderrr) => {
    if (err) {
      process.stdout.write(`Start service error: ${stderrr}`);
      return;
    }
    states.started();
  });
}

function restartService () {
  const opts = {
    encoding: 'utf-8',
    name: app.getName(),
    icns: getasset('app-icon.png'),
  };
  states.idleing();
  sudo.exec(commands.sudo.restart, opts, (err, stdout, stderrr) => {
    if (err) {
      process.stdout.write(`Restart service error: ${stderrr}`);
      return;
    }
    states.started();
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

const isRunning = () =>
  new Promise((resolve, reject) => {
    childprocess.exec(
      // looking for httpd processes
      commands.nosudo.isrunning,
      (err, stdout, stderr) => {
        if (err) {
          // FIXME -> add debug
          process.stdout.write(`Apache isRunning() error: ${stderr}`);
          reject(stderr);
          return;
        }
        let pids = (stdout && stdout.split('\n')) || [];
        // filtering process with grep as a command
        pids = pids.filter(str => str && str.indexOf('grep') < 0);
        resolve(pids.length > 0);
      },
      { encoding: 'utf-8' },
    );
  });

function initMenu () {
  stopitem = contextMenu.getMenuItemById('stop-controller');
  startitem = contextMenu.getMenuItemById('start-controller');
  restartitem = contextMenu.getMenuItemById('restart-controller');
  statuslabel = contextMenu.getMenuItemById('status-controller-label');
  isRunning()
    .then((running) => {
      restartitem.visible = true;
      statuslabel.visible = true;
      if (running) states.started();
      else states.stopped();
      tray.setContextMenu(contextMenu);
    })
    .catch(() => {
      states.errored();
      tray.setContextMenu(contextMenu);
    });
  // FAIL :(
  // .finally(() => {
  //   tray.setContextMenu(contextMenu);
  // });
}

// quand l'user click sur l'icone dans le dock
// quand l'utilisateur click sur l'icone de fermeture de fenetre
app.on('window-all-closed', () => (!isdarwin() ? app.quit() : noop));
app.on('ready', () => {
  app.dock.hide();
  tray = new Tray(icons.idle);
  // tray.setTitle(`${app.getName()} v${app.getVersion()}`);
  tray.setToolTip(`${app.getName()} v${app.getVersion()}`);
  contextMenu = Menu.buildFromTemplate([
    {
      enabled: false,
      visible: false,
      label: 'Server status',
      id: 'status-controller-label',
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
    {
      enabled: false,
      visible: false,
      click: restartService,
      label: 'Restart server',
      id: 'restart-controller',
    },
    { type: 'separator' },
    { label: `About ${app.getName()}`, role: 'about' },
    { label: `Version ${app.getVersion()}`, enabled: false },
    // { type: 'separator' },
    // { label: 'Dev menu', enabled: false },
    // { label: 'Reload', role: 'forcereload' },
    { type: 'separator' },
    { label: 'Quitter', role: 'quit' },
  ]);
  tray.setContextMenu(contextMenu);
  initMenu();
});
