const LevelsMap = new Map<string, number>([
  ['SUCCESS', 0b1],
  ['INFO', 0b10],
  ['ERROR', 0b100],
  ['WARNING', 0b1000],
])
type Target = {
  [key: string]: any;
  add: (name: string) => void;
  remove: (name: string) => void;
  keys: () => string[]
}
const target: Target = {
  add: (name: string) => {
    const val = Math.pow(2, LevelsMap.size)
    LevelsMap.set(name.toUpperCase(), val)
  },
  remove: (name: string) => LevelsMap.delete(name),
  keys: () => [...LevelsMap.keys()]
}
Object.defineProperty(target, 'ALL', {
  get() {
    return Math.pow(2, LevelsMap.size) - 1
  }
})
const Levels = new Proxy(target, {
  get(target, name: string) {
    if (name in target) return target[name]
    if (name.toUpperCase() in target) return target[name.toUpperCase()]
    return LevelsMap.get(name.toUpperCase())
  }
})
export { Levels }
