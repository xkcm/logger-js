import chalk from "chalk"
import { chalkTaggedTemplate, createAutoIncrement, unchalk } from "../src/utils"

describe('test suite for utils', () => {
  it('should create autoincrement generator (start=0, step=1)', () => {
    const step = 1
    const start = 0
    const next = createAutoIncrement(start, step)
    for (let i = start; i < 10; i += step) {
      expect(next()).toEqual(i)
    }
  })
  it('should unchalk unstyled string', () => {
    const text = "raw message"
    expect(unchalk(text)).toBe(text)
  })
  it('should unchalk styled string', () => {
    const text = "message"
    const redtext = chalk.red(text)
    expect(unchalk(redtext)).toBe(text)
  })
  it('should chalk tagged template', () => {
    const template = 'message {red.bold red message}'
    expect(chalkTaggedTemplate(template)).toBe('message \u001b[31m\u001b[1mred message\u001b[22m\u001b[39m')
  })
})