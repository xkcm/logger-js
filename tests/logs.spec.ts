import { Logger, Transport, Levels } from '../src/index'
import { lorem } from 'faker'

const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

describe('Testing loggers', () => {
  let logger: Logger
  it('should create a new logger', () => {
    logger = new Logger({
      transports: {
        console1: Transport.Console()
      }
    })
    expect(logger instanceof Logger).toBeTruthy()
    expect(logger.getFormat()).toBe(Logger.defaultFormatString)
    expect(logger.getLevel()).toBe(Levels.ALL)
  })
  it('should change log format and log "TestMessage1_$" to console', () => {
    const FORMAT = "%msg"
    logger.setFormat(FORMAT)
    expect(logger.getFormat()).toBe(FORMAT)
    logger.log("TestMessage1_$")
    expect(mockStdout).toBeCalledWith("TestMessage1_$\n")
  })
  it('should log multiple messages', () => {
    const msgs = [lorem.words(2), lorem.words(4)]
    logger.log(...msgs)
    expect(mockStdout).toBeCalledWith(msgs.join(' ') + '\n')
  })
  it('should add new transport', () => {
    const key = 'console2'
    logger.addTransport(key, Transport.Console())
    expect(logger.getTransports()).toContainEqual(expect.objectContaining({ key }))
  })
  it('should remove added transport', () => {
    const key = 'console2'
    logger.removeTransport(key)
    expect(logger.getTransports()).not.toContainEqual(expect.objectContaining({ key }))
  })
  it('should mute messages', () => {
    mockStdout.mockClear()
    logger.muteMessages()
    logger.log('it shouldnt be displayed')
    expect(mockStdout).not.toHaveBeenCalled()
  })

  const mockedTransportContext = {
    paths: ['./logs/error.log', './logs/access.log']
  }
  const mockedTransport = new Transport({
    context: mockedTransportContext
  })
  const mockedWrite = jest.fn()
  mockedTransport.setMethod('write', mockedWrite)
  const logger2 = new Logger({
    transports: {
      mocked: mockedTransport
    }
  })

  it('should pipe messages to another logger', () => {
    const pipe = logger.pipe(logger2)
    const msg = lorem.paragraph(3)
    const pipeSpy = jest.spyOn(pipe, 'write')
    logger.log(msg)
    expect(mockedWrite).toBeCalledWith(expect.objectContaining({
      content: {
        formatted: msg + '\n',
        unformatted: msg + '\n',
        segments: [msg],
        joinedSegments: msg
      }
    }), mockedTransportContext)
    expect(pipeSpy).toHaveBeenCalled()
  })
  let copy: Logger
  it('should create copy with pipe', () => {
    copy = logger.createCopy()
    const copyPipes = copy.getPipes()
    copy.log('msg')
    expect(mockStdout).toBeCalledWith('msg\n')
    expect(copyPipes.length).toEqual(1)
    const pipe = copyPipes[0]
    expect(pipe.isMuted()).toBeTruthy()
    expect(pipe.doesUnmuteMessages()).toBeFalsy()
  })
  it('should destroy pipe', () => {
    const destroyedPipe = copy.getPipes()[0].destroy()
    expect(copy.getPipes().length).toEqual(0)
    expect(destroyedPipe.receiver).toBeUndefined()
    expect(destroyedPipe.sender).toBeUndefined()
  })
  it('should add new level', () => {
    Levels.add('YOMENIK')
    expect(Levels.YOMENIK).toBeDefined()
    expect(Levels.ALL).toEqual(Levels.YOMENIK * 2 - 1)
    expect(Levels.keys().length).toEqual(5)
    expect(logger.getLevel()).toEqual(Levels.ALL)
  })
  it('"ALL" level should match value', () => {
    expect(logger.getLevel()).toEqual(Levels.ALL)
  })
})