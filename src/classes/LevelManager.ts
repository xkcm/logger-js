
export class LevelManager {
  private levelsMap = new Map<string, number>()
  constructor(opts: { skipDefault?: boolean, custom?: string[] } = {}){
    if (!opts.skipDefault) {
      this.add('INFO')
      this.add('SUCCESS')
      this.add('WARNING')
      this.add('ERROR')
    }
    if (opts.custom) {
      opts.custom.forEach(this.add.bind(this))
    }
  }
  public add(name: string): number{
    name = name.toUpperCase()
    if (name === 'ALL') return
    const s = this.levelsMap.size
    this.levelsMap.set(name, Math.pow(2, s))
  }
  public get(...names: string[]): number{
    names = names.map(name => name.toUpperCase())
    let result = 0
    const getVal = (name: string) => {
      if (name === 'ALL') return Math.pow(2, this.levelsMap.size) - 1
      else return this.levelsMap.get(name) ?? 0
    }
    return names.reduce((prev, cur) => prev | getVal(cur), result)
  }
  public getLevelNames(): string[]{
    return [...this.levelsMap.keys()]
  }
}
