export function hash32(seed: number, a = 0, b = 0, c = 0, d = 0): number {
  let hash = seed >>> 0
  hash ^= Math.imul(a + 0x9e3779b9, 0x85ebca6b)
  hash = (hash << 13) | (hash >>> 19)
  hash ^= Math.imul(b + 0xc2b2ae35, 0x27d4eb2d)
  hash = (hash << 11) | (hash >>> 21)
  hash ^= Math.imul(c + 0x165667b1, 0x7feb352d)
  hash = (hash << 7) | (hash >>> 25)
  hash ^= Math.imul(d + 0xd3a2646c, 0x846ca68b)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x2c1b3c6d)
  hash ^= hash >>> 12
  hash = Math.imul(hash, 0x297a2d39)
  hash ^= hash >>> 15
  return hash >>> 0
}

export function random01(seed: number, a = 0, b = 0, c = 0, d = 0): number {
  return hash32(seed, a, b, c, d) / 0xffffffff
}

export function pickSign(seed: number, a = 0, b = 0, c = 0, d = 0): -1 | 1 {
  return (hash32(seed, a, b, c, d) & 1) === 0 ? -1 : 1
}

export function fnv1a(values: ArrayLike<number>): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < values.length; index += 1) {
    hash ^= values[index] ?? 0
    hash = Math.imul(hash, 0x01000193)
  }
  hash >>>= 0
  return hash === 0 ? 1 : hash
}
