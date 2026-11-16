export function createRandom(seed = 1) {
  const numericSeed = Number(seed);
  let state = (Number.isFinite(numericSeed) ? numericSeed : 1) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random, low, high) {
  return low + (high - low) * random();
}

export function seedFromQuery(search) {
  const raw = new URLSearchParams(search).get('seed');
  const value = raw === null ? 1 : Number(raw);
  return Number.isFinite(value) ? value >>> 0 : 1;
}
