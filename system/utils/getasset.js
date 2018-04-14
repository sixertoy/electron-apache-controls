const path = require('path');
const isdarwin = require('./isdarwin');

module.exports = (name) => {
  const os = isdarwin() ? 'mac' : 'default';
  return path.join(__dirname, '..', '..', 'assets', os, name);
};
