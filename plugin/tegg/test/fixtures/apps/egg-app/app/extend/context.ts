const COUNTER = Symbol('Context#counter');

export default {
  get counter() {
    if (!this[COUNTER]) {
      this[COUNTER] = 0;
    }
    return this[COUNTER]++;
  },

  get user() {
    return {};
  },
};
