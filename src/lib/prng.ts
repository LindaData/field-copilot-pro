/** Deterministic seeded PRNG (mulberry32). Same seed → identical sequence forever. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    int: (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)],
    pickN: <T>(arr: readonly T[], n: number): T[] => {
      const copy = [...arr];
      const out: T[] = [];
      const take = Math.min(n, copy.length);
      for (let i = 0; i < take; i++) {
        const idx = Math.floor(r() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    },
    chance: (p: number) => r() < p,
  };
}
