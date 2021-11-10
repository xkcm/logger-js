import { lorem } from 'faker'
import fs from 'fs'

import { Logger, Transport } from '../src/index'

describe('Testing loggers', () => {

  const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  let logger: Logger
  
  it('should create a new logger', () => {
    logger = new Logger({
      transports: {
        console1: Transport.builtin.Console()
      }
    })
    expect(logger).toBeInstanceOf(Logger)
    expect(logger.getFormat()).toBe(Logger.DEFAULT_FORMAT_STRING)
    expect(logger.getLevel()).toBe(logger.levels.get('ALL'))
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
    logger.addTransport(key, Transport.builtin.Console())
    expect(logger.getTransports()).toContainEqual(expect.objectContaining({ key }))
  })
  it('should remove added transport', () => {
    const key = 'console2'
    logger.removeTransport(key)
    expect(logger.getTransports()).not.toContainEqual(expect.objectContaining({ key }))
  })
  it('should mute messages', () => {    
    logger.muteMessages()
    logger.log('it shouldnt be displayed')
    expect(mockStdout).not.toHaveBeenCalled()
    logger.unmuteMessages()
    logger.log('it should be displayed')
    expect(mockStdout).toHaveBeenCalled()
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
        plain: msg + '\n',
        passedSegments: [msg],
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
  it('should destroy pipes', () => {
    const destroyedPipe0 = copy.getPipes()[0].destroy()
    expect(copy.getPipes().length).toEqual(0)
    expect(destroyedPipe0.receiver).toBeUndefined()
    expect(destroyedPipe0.sender).toBeUndefined()

    const destroyedPipe1 = logger.getPipes()[0].destroy()
    expect(logger.getPipes().length).toEqual(0)
    expect(destroyedPipe1.receiver).toBeUndefined()
    expect(destroyedPipe1.sender).toBeUndefined()
  })
  it('should create file logger and log into file', () => {
    const spiedFn = jest.spyOn(fs, 'writeFileSync')
    const fileTransport = Transport.builtin.File({ filepath: '/dev/null' })
    const fileLogger = new Logger({
      transports: { fileTransport }
    })
    fileLogger.log('test')
    expect(spiedFn).toBeCalled()
  })
  it('"ALL" level should match value', () => {
    expect(logger.getLevel()).toEqual(logger.levels.get('ALL'))
  })
  it('should set a new logging level', () => {
    const newLevel = logger.levels.get('INFO') | logger.levels.get('SUCCESS')
    logger.setLevel(newLevel)
    expect(logger.getLevel()).not.toEqual(logger.levels.get('ALL'))
    expect(logger.getLevel()).toEqual(newLevel)
  })
  it('should not log error message', () => {    
    logger.error("error_msg")
    expect(mockStdout).not.toHaveBeenCalled()
  })
  it('should log info message', () => {    
    logger.info("info_msg")
    expect(mockStdout).toHaveBeenCalled()
  })
})