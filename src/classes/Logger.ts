import { cloneDeep, fromPairs } from "lodash"
import { LevelManager } from "./LevelManager"
import { createAutoIncrement, formatId, chalkTaggedTemplate, unchalk } from "../utils"
import { Pipe } from "./Pipe"
import { Transport } from "./Transport"
import { TLogger, TTransport } from "./Types"

const loggerInstances: Logger[] = []
const nextLoggerId = createAutoIncrement()
function newLoggerId(id?: TLogger.ID): TLogger.ID {
  if (id && !loggerInstances.some(l => l.getId() === id)) return id
  return newLoggerId(formatId('logger', nextLoggerId()))
}
export class Logger {

  static DEFAULT_FORMAT_STRING = '%symbol %msg {gray [%date]}'
  static FORMAT_PREFIX = '%'
  static DEFAULT_REDUCER = (
    (convertOptions) =>
      (a, b, i, msgs) =>
        {
          a += typeof b === "string" ? b : JSON.stringify(b)
          if (i != msgs.length - 1) a += convertOptions.joinChar || ' '
          return a
        }
  )

  public levels: LevelManager

  private areMessagesMuted = false
  private formatString: string
  private level: number = 0

  private reducer: TLogger.Reducer
  private transports: Record<TTransport.ID, Transport> = {}
  private predefinedValues = new Map<string, TLogger.PredefinedValue>([
    ["date", () => new Date().toISOString()],
    ["symbol", (msg) => {
      if (msg.level & this.levels.get('INFO')) return "[INFO]"
      if (msg.level & this.levels.get('WARNING')) return "[WARNING]"
      if (msg.level & this.levels.get('SUCCESS')) return "[SUCCESS]"
      if (msg.level & this.levels.get('ERROR')) return "[ERROR]"
      return ""
    }]
  ])
  private pipes: Pipe[] = []
  private id: string

  constructor(options: TLogger.ConstructorOptions) {
    this.transports = options.transports
    this.id = newLoggerId(options.id)
    this.formatString = options.format || Logger.DEFAULT_FORMAT_STRING

    this.reducer = options.replacer || Logger.DEFAULT_REDUCER

    if (options.predefinedValues) Object.entries(options.predefinedValues).forEach(([k, v]) => {
      this.predefinedValues.set(k, v)
    })

    this.levels = new LevelManager({
      skipDefault: false,
      custom: [...(options.customLevels || [])]
    })
    this.setLevel(options.logLevel || this.levels.get('ALL'))
    
    loggerInstances.push(this)
  }
  // helpers
  public convertToString(msgs: unknown[] | unknown, convertOptions: TLogger.ConvertOptions): string {
    return (
      Array.isArray(msgs)
      ? msgs
      : [msgs]
    ).reduce<string>(this.reducer(convertOptions).bind(this), '')
  }
  public formatMessage(msg: TLogger.MessageObject, dformat = this.formatString, localPredefinedValues: TLogger.PredefinedValuesObject = {}, convertOptions: TLogger.ConvertOptions = {}) {

    const evalPredefinedValue = (val: TLogger.PredefinedValue, msg: TLogger.MessageObject): string => {
      if (typeof val === 'function') return this.convertToString(val(msg), convertOptions)
      else return this.convertToString(val, convertOptions)
    }

    const formatValues = new Map<string, string>([
      ["%msg", msg.content.joinedSegments]
    ])
    const addPredefinedValues = (iterable: Iterable<[string, TLogger.PredefinedValue]>) => {
      for (let [key, predefined] of iterable) {
        formatValues.set(key.startsWith("%") ? key : "%" + key, evalPredefinedValue(predefined, msg))
      }
    }
    addPredefinedValues(this.predefinedValues)
    addPredefinedValues(Object.entries(localPredefinedValues))

    const format = dformat.replace(/(%[a-zA-Z0-9_-]+)/g, (found) => {
      if (formatValues.has(found)) return formatValues.get(String(found))
      return found
    })

    return chalkTaggedTemplate(format)
  }
  // core logic
  public logWithOptions(raw: unknown[], options: Partial<TLogger.MessageObject> = {}, convertOptions: TLogger.ConvertOptions = {}) {
    if (!Array.isArray(raw)) raw = [raw]
    const endl = options.endl ?? true
    const format = options.format || this.formatString || Logger.DEFAULT_FORMAT_STRING
    const joinedSegments = this.convertToString(raw, convertOptions)
    const msg: TLogger.MessageObject = {
      ...options,
      content: {
        passedSegments: raw,
        joinedSegments
      },
      level: options.level ?? this.levels.get('INFO'),
      sourceLogger: this.id,
      endl,
      format
    }
    if (this.formatString) {
      const formatted = this.formatMessage(msg, format, options.predefinedValues, convertOptions) + (endl ? '\n' : '')
      msg.content.formatted = formatted
      msg.content.plain = unchalk(formatted)
    }
    return this.postMessage(msg)
  }
  public log(...msgs: unknown[]): this { return this.info(...msgs) }
  public info(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: this.levels.get('INFO')
    })
    return this
  }
  public warn(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: this.levels.get('WARNING')
    })
    return this
  }
  public success(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: this.levels.get('SUCCESS')
    })
    return this
  }
  public error(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: this.levels.get('ERROR')
    })
    return this
  }
  public postMessage(msg: TLogger.MessageObject): this {
    if (!(msg.level & this.getLevel()) || this.areMessagesMuted) msg.muted = true
    for (let pipe of this.pipes) pipe.write(cloneDeep(msg))
    for (let transport of Object.values(this.transports)) transport.post(msg)
    return this
  }
  // copy
  public createCopy(options: Partial<TLogger.ConstructorOptions> = {}): Logger {
    const clone = new Logger({
      predefinedValues: fromPairs([...this.predefinedValues.entries()]),
      replacer: this.reducer,
      transports: {
        ...this.transports
      },
      ...options
    })
    clone.setFormat(options.format ?? this.formatString)
    clone.setLevel(options.logLevel ?? this.getLevel())
    clone.pipe(this).mute()
    for (let entry of this.predefinedValues.entries()) clone.setPredefinedValue(...entry)
    return clone
  }
  // pipes
  public pipe(logger: Logger) {
    const pipe = new Pipe(this, logger)
    this.pipes.push(pipe)
    return pipe
  }
  public getPipes(): Pipe[] {
    return [...this.pipes.values()]
  }
  public removePipe(pipeId: string) {
    const i = this.pipes.findIndex(p => p.getId() === pipeId)
    return this.pipes.splice(i, 1)
  }
  // format
  public setFormat(format?: string): this {
    this.formatString = format || Logger.DEFAULT_FORMAT_STRING
    return this
  }
  public getFormat() {
    return this.formatString
  }
  // level
  public setLevel(level: number) {
    this.level = level
    return this
  }
  public getLevel(): number {
    return this.level
  }

  // transports
  public addTransport(key: string, transport: Transport): this {
    if (Reflect.has(this.transports, key)) throw new Error('Transport with this key is already declared')
    Reflect.set(this.transports, key, transport)
    return this
  }
  public getTransports(): { key: string, transport: Transport }[] {
    return Object.entries(this.transports).map(([key, transport]) => ({ key, transport }))
  }
  public removeTransport(key: string) {
    Reflect.deleteProperty(this.transports, key)
    return this
  }
  // muting messages
  public muteMessages() { return this.areMessagesMuted = true }
  public unmuteMessages() { return this.areMessagesMuted = false }
  public isMuted() { return this.areMessagesMuted }

  // predefined values
  public setPredefinedValue(key: string, value: TLogger.PredefinedValue): Logger {
    this.predefinedValues.set(key, value)
    return this
  }
  public getPredefinedValue(key: string): TLogger.PredefinedValue | undefined {
    return this.predefinedValues.get(key)
  }
  public removePredefinedValue(key: string): Logger {
    this.predefinedValues.delete(key)
    return this
  }

  // getters
  public getId(): string {
    return this.id
  }

  public getPipe(pipeId: string){
    return this.pipes.find(pipe => pipe.getId() === pipeId)
  }
}
