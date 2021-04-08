import { Logger, Transport } from '../index'

const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

describe('Testing loggers', () => {
  const logger = new Logger({
    transports: [
      Transport.Console()
    ]
  })
  Transport.Console()
  it('should change log format log "TestMessage1_$" to console', () => {
    const FORMAT = "%msg"
    logger.setLogFormat(FORMAT)
    expect(logger.getLogFormat()).toBe(FORMAT)
    logger.log("TestMessage1_$")
    expect(mockStdout).toHaveBeenCalledWith("TestMessage1_$\n")
  })
})