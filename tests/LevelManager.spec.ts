import { LevelManager } from "../src/classes/LevelManager"

describe("LevelManager unit tests", () => {
  const Levels = new LevelManager()
  it('should add a new level', () => {
    Levels.add('YOMENIK')
    expect(Levels.get('YOMENIK')).toBeDefined()
    expect(Levels.get('ALL')).toEqual(Levels.get('YOMENIK') * 2 - 1)
    expect(Levels.getLevelNames().length).toEqual(5)
  })  
})