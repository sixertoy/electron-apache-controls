/* eslint no-console: 0 */
const noop = require('./noop');
const isdevelopment = require('./isdevelopment');

module.exports = str => (!isdevelopment() ? noop
  : console.log(str));
