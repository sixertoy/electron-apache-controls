const each = (args, ...fns) =>
  fns.map(fn => fn(...args));

const compose = (...fns) => fns.reverse()
  .reduce((prev, next) => value => next(prev(value)), value => value);

const pipe = (...fns) =>
  compose.apply(compose, fns.reverse());

module.exports = { compose, pipe, each };
