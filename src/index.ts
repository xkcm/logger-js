import { cloneDeep, fromPairs } from "lodash"
import { chalkTaggedTemplate, createAutoIncrement, unchalk } from "./utils"
import { Levels } from "./levels"

namespace TTransport {
  export type ID = string
  export type DefinedMethod = (msg: TLogger.Message, context?: unknown) => void | unknown
  export type DefinedMethodKey = "write"
  export type ConstructorOptions = {
    context?: unknown;
    id?: string;
  }
}
namespace TLogger {
  export type ID = string
  export type PredefinedValue = ((msg?: string) => string) | string
  export type PredefinedValuesObject = Record<string, PredefinedValue>
  export type Replacer = (a: string, b: unknown, index?: number, array?: unknown[]) => string
  export type ConstructorOptions = {
    transports: Record<TTransport.ID, Transport>;
    replacer?: Replacer;
    predefinedValues?: PredefinedValuesObject;
    id?: string;
    format?: string;
    logLevel?: number;
  }
  export type Message = {
    content: {
      segments: unknown[];
      joinedSegments: string;
      formatted?: string;
      unformatted?: string;
    };
    level: number;
    sourceLogger: string;
    forceFormat?: string;
    predefinedValues?: PredefinedValuesObject;
    muted?: boolean;
    seperateLines?: boolean;
    endl?: boolean;
    format?: string;
  }
}

const formatId = (prefix: string, id: number) => `${prefix}0x${id.toString(16)}`
const transportInstances: Transport[] = []
const nextTransportId = createAutoIncrement()
function newTransportID(id?: TTransport.ID): TTransport.ID {
  if (id && !transportInstances.some(t => t.id === id)) return id
  return newTransportID(formatId('transport', nextTransportId()))
}
const loggerInstances: Logger[] = []
const nextLoggerId = createAutoIncrement()
function newLoggerId(id?: TLogger.ID): TLogger.ID {
  if (id && !loggerInstances.some(l => l.getId() === id)) return id
  return newLoggerId(formatId('logger', nextLoggerId()))
}
const pipesInstances: Pipe[] = []
const nextPipeId = createAutoIncrement()
function newPipeId(): string {
  return formatId('pipe', nextPipeId())
}

export class Transport {
  private definedMethods = new Map<TTransport.DefinedMethodKey, TTransport.DefinedMethod>()
  private enabled: boolean = true
  public context: unknown
  public id: TTransport.ID

  static Console(context?: unknown): Transport {
    const transport = new Transport({ context })
    transport.setMethod('write', (msg, context) => {
      if (!msg.muted) process.stdout.write(msg.content.formatted)
    })
    return transport
  }

  constructor(opts: TTransport.ConstructorOptions = {}) {
    this.context = opts.context ?? {}
    this.id = newTransportID(opts.id)
    transportInstances.push(this)
  }
  public post(msg) {
    if (this.enabled) {
      if (this.definedMethods.has("write")) {
        const cb = this.definedMethods.get("write")
        cb(msg, this.context)
        return true
      } else return false
    } else return false
  }
  public setMethod(key: TTransport.DefinedMethodKey, callback: TTransport.DefinedMethod, opts?: { force: boolean }): boolean {
    if (this.definedMethods.has(key) && !opts.force) return false
    this.definedMethods.set(key, callback)
    return true
  }
  public removeMethod(key): boolean {
    return this.definedMethods.delete(key)
  }
  public disable() { this.enabled = false }
  public enable() { this.enabled = true }
}

class Pipe {
  static Instances: Pipe[] = []

  private muted = false
  private unmutingMessages = false
  private id: string

  constructor(public sender: Logger, public receiver: Logger) {
    const p = pipesInstances.find(pipe =>
      pipe.sender.getId() === sender.getId() && pipe.receiver.getId() === receiver.getId()
    )
    if (p instanceof Pipe) return p
    pipesInstances.push(this)
    this.id = newPipeId()
  }
  write(msg: TLogger.Message) {
    if (this.muted === true) msg.muted = true
    if (msg.muted === true && this.unmutingMessages) msg.muted = false
    this.receiver.postMessage(msg)
  }
  public mute() {
    this.muted = true
    return this
  }
  public unmute() {
    this.muted = false
    return this
  }
  public enableUnmutingMessages() {
    this.unmutingMessages = true
    return this
  }
  public disableUnmutingMessages() {
    this.unmutingMessages = false
    return this
  }
  public destroy() {
    this.sender.removePipe(this.id)
    this.sender = undefined
    this.receiver = undefined
    const i = pipesInstances.findIndex(p => p.getId() === this.id)
    return pipesInstances.splice(i, 1)[0]
  }
  public getId() {
    return this.id
  }
  public isMuted() {
    return this.muted
  }
  public doesUnmuteMessages() {
    return this.unmutingMessages
  }
}

export class Logger {

  static defaultFormatString = '%log-symbol %msg {gray [%date]}'

  private areMessagesMuted = false

  private formatString: string = Logger.defaultFormatString
  private level: number = 0
  private doesLevelIncludeAllLevels: boolean = false
  private replacer: TLogger.Replacer

  private transports: Record<TTransport.ID, Transport> = {}
  private predefinedValues = new Map<string, TLogger.PredefinedValue>([
    ["pre", ""],
    ["post", ""],
    ["date", () => new Date().toISOString()],
    ["info-symbol", "ℹ️ "],
    ["warn-symbol", "⚠️ "],
    ["success-symbol", "✅"],
    ["error-symbol", "❌"]
  ])
  private pipes: Pipe[] = []
  private id: string

  static createLogger(opts: TLogger.ConstructorOptions) {
    return new Logger(opts)
  }

  constructor(opts: TLogger.ConstructorOptions) {
    this.transports = opts.transports
    this.id = newLoggerId(opts.id)
    this.replacer = opts?.replacer || ((a, b, i, msgs) => {
      a += typeof b === "string" ? b : JSON.stringify(b)
      if (i != msgs.length - 1) a += ' '
      return a
    })
    if (opts?.predefinedValues) Object.entries(opts.predefinedValues).forEach(([k, v]) => {
      this.predefinedValues.set(k, v)
    })
    this.setLevel(Levels.ALL)
    loggerInstances.push(this)
  }
  // helpers
  public convertToString(msgs: unknown[] | unknown): string {
    return (Array.isArray(msgs) ? msgs : [msgs]).reduce<string>(this.replacer.bind(this), '')
  }
  public formatMessage(joinedSegments: string, dformat = this.formatString, localPredefinedValues: TLogger.PredefinedValuesObject = {}) {
    const evalPredefinedValue = (val: TLogger.PredefinedValue, msg: string): string => {
      return typeof val === 'function' ? this.convertToString(val(msg)) : this.convertToString(val)
    }
    const formatValues = new Map<string, string>([
      ["%msg", joinedSegments]
    ])
    const addPredefinedValues = (iterable: Iterable<[string, TLogger.PredefinedValue]>) => {
      for (let [key, predefined] of iterable) {
        formatValues.set(key.startsWith("%") ? key : "%" + key, evalPredefinedValue(predefined, joinedSegments))
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
  private logWithOptions(raw: unknown[], options: Partial<TLogger.Message> = {}) {
    const endl = options.endl ?? true
    const format = options.format || this.formatString
    const joinedSegments = this.convertToString(raw)
    const msg: TLogger.Message = {
      ...options,
      content: {
        segments: raw,
        joinedSegments
      },
      level: options.level ?? Levels.INFO,
      sourceLogger: this.id,
      endl,
      format
    }
    if (this.formatString) {
      const formatted = this.formatMessage(joinedSegments, options.forceFormat, options.predefinedValues) + (endl ? '\n' : '')
      msg.content.formatted = formatted
      msg.content.unformatted = unchalk(formatted)
    }
    return this.postMessage(msg)
  }
  public log(...msgs: unknown[]): this { return this.info(...msgs) }
  public info(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: Levels.INFO,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("info-symbol")
      }
    })
    return this
  }
  public warn(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: Levels.WARNING,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("warn-symbol")
      }
    })
    return this
  }
  public success(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: Levels.SUCCESS,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("success-symbol")
      }
    })
    return this
  }
  public error(...msgs: unknown[]): this {
    this.logWithOptions(msgs, {
      level: Levels.ERROR,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("error-symbol")
      }
    })
    return this
  }
  public postMessage(msg: TLogger.Message): this {
    if (!(msg.level & this.getLevel()) || this.areMessagesMuted) msg.muted = true
    for (let pipe of this.pipes) pipe.write(cloneDeep(msg))
    for (let transport of Object.values(this.transports)) transport.post(msg)
    return this
  }
  // copy
  public createCopy(options: Partial<TLogger.ConstructorOptions> = {}): Logger {
    const clone = new Logger({
      predefinedValues: fromPairs([...this.predefinedValues.entries()]),
      replacer: this.replacer,
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
    this.formatString = format || Logger.defaultFormatString
    return this
  }
  public getFormat() {
    return this.formatString
  }
  // level
  public setLevel(level: number) {
    if (level === Levels.ALL) this.doesLevelIncludeAllLevels = true
    this.level = level
    return this
  }
  public getLevel(): number {
    return this.doesLevelIncludeAllLevels ? Levels.ALL : this.level
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
  public muteMessages() { this.areMessagesMuted = true }
  public unmuteMessages() { this.areMessagesMuted = false }
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
}

export { Levels }
