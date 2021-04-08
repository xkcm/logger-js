import { cloneDeep } from "lodash"
import { chalkTaggedTemplate, createAutoIncrement, vtype } from "./utils"

type PredefinedValue = unknown | (() => unknown)
type PredefinedValuesObject = Record<string, PredefinedValue>
type ReplacerFn = (a: string, b: unknown, index?: number, array?: unknown[]) => string
type LoggerConstructorOptions = Partial<{
  replacer: ReplacerFn;
  predefinedValues: PredefinedValuesObject;
  id: string;
  format: string;
  logLevel: number;
}> & Required<{
  transports: Transport[]
}>

type LoggerMessage = {
  content: {
    raw: unknown[];
    formatted?: string;
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
type DefinedMethod = (msg: LoggerMessage, context?: unknown) => void | unknown
type DefinedMethodKey = "write"
type DefinedMethods = Map<DefinedMethodKey, DefinedMethod>

export class Transport {
  private definedMethods: DefinedMethods = new Map()
  private enabled: boolean = true

  static Console(context?: any): Transport {
    const transport = new Transport(context)
    transport.setMethod('write', (msg, context) => {
      process.stdout.write(msg.content.formatted)
    })
    return transport
  }

  constructor(public context?: any){}
  public post(msg){
    if (this.enabled){
      if (this.definedMethods.has("write")) {
        const cb = this.definedMethods.get("write")
        cb(msg, this.context)
        return true
      } else return false
    } else return false
  }
  public setMethod(key, callback, opts?: { force: boolean }): boolean {
    if (this.definedMethods.has(key) && !opts.force) return false
    this.definedMethods.set(key, callback)
    return true
  }
  public removeMethod(key): boolean {
    return this.definedMethods.delete(key)
  }
  public disable(){ this.enabled = false }
  public enable(){ this.enabled = true }
}

const declaredLoggers: Set<string> = new Set()
const nextLoggerId = createAutoIncrement()

class Pipe {
  static Instances: Pipe[] = []

  private muted = false
  private unmutingMessages = false

  constructor(private sender: Logger, private receiver: Logger){
    const f = Pipe.Instances.find(pipe =>
      pipe.sender.getId() === sender.getId() && pipe.receiver.getId() === receiver.getId()
    )
    if (f !== undefined) return f
    else Pipe.Instances.push(this)
  }
  write(msg: LoggerMessage){
    if (this.muted === true) msg.muted = true
    if (msg.muted === true && this.unmutingMessages) msg.muted = false
    this.receiver.write(msg)
  }
  mute(){
    this.muted = true
    return this
  }
  unmute(){
    this.muted = false
    return this
  }
  enableUnmutingMessages(){
    this.unmutingMessages = true
    return this
  }
  disableUnmutingMessages(){
    this.unmutingMessages = false
    return this
  }
}

export class Logger {

  static defaultFormat = '%log-symbol %msg {gray [%date]}'
  static SUCCESS = 0b1
  static INFO = 0b10
  static ERROR = 0b100
  static WARNING = 0b1000
  static ALL = Logger.SUCCESS | Logger.INFO | Logger.ERROR | Logger.WARNING

  private areMessagesMuted = false

  private logFormat: string = Logger.defaultFormat
  private logLevel: number = Logger.ALL
  private replacer: ReplacerFn

  private transports: Transport[]
  private predefinedValues: Map<string, PredefinedValue> = new Map([
    ["pre", ""],
    ["post", ""],
    ["date", () => new Date().toISOString()] as any,
    ["info-symbol", "ℹ️ "],
    ["warn-symbol", "⚠️ "],
    ["success-symbol", "✅"],
    ["error-symbol", "❌"]
  ])
  private pipes: Pipe[] = []
  private id: string

  static createLogger(opts: LoggerConstructorOptions){
    return new Logger(opts)
  }

  constructor(opts: LoggerConstructorOptions){
    this.transports = opts.transports
    this.id = opts?.id ?? `logger0x${nextLoggerId().toString(16)}`
    declaredLoggers.add(this.id)
    this.replacer = opts?.replacer || ((a, b, i, msgs) => {
      a += typeof b === "string" ? b : JSON.stringify(b)
      if ( i != msgs.length-1) a += ' '
      return a
    })
    if (opts?.predefinedValues) Object.entries(opts.predefinedValues).forEach(([k, v]) => {
      this.predefinedValues.set(k, v)
    })
  }
  public convertToString(msgs: unknown[] | unknown): string{
    return (Array.isArray(msgs) ? msgs : [msgs]).reduce<string>(this.replacer.bind(this), '')
  }
  public formatMessage(msg: LoggerMessage, dformat = this.logFormat, localPredefinedValues: { [key: string]: PredefinedValue } = {}){
    const evalPredefinedValue = (val: PredefinedValue, msg: string): string => {
      return typeof val === 'function' ? this.convertToString(val(msg)) : this.convertToString(val)
    }
    const stringMsg = this.convertToString(msg.content.raw)
    const formatValues: Map<string, string> = new Map([
      ["%msg", stringMsg]
    ])
    const addPredefinedValues = (iterable: Iterable<[string, PredefinedValue]>) => {
      for (let [key, predefined] of iterable){
        formatValues.set(key.startsWith("%") ? key : "%" + key, evalPredefinedValue(predefined, stringMsg))
      }
    }
    addPredefinedValues(this.predefinedValues.entries())
    addPredefinedValues(Object.entries(localPredefinedValues))

    const format = dformat.replace(/(%[a-zA-Z0-9_-]+)/g, (found) => {
      if (formatValues.has(found)) return formatValues.get(String(found))
      return found
    })

    return chalkTaggedTemplate(format)
  }
  public logOptions(raw: any[], options: Partial<LoggerMessage> = {}){
    const endl = options.endl ?? true
    const format = options.format || this.logFormat
    const msg: LoggerMessage = {
      ...options,
      content: {
        raw
      },
      level: options.level ?? Logger.INFO,
      sourceLogger: this.id,
      endl,
      format
    }
    if (this.logFormat) {
      const formatted = this.formatMessage(msg, options.forceFormat, options.predefinedValues) + (endl ? '\n' : '')
      msg.content.formatted = formatted
    }
    return this.write(msg)
  }
  public log(...msgs: any){ this.info(...msgs) }
  public info(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.INFO,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("info-symbol")
      }
    })
  }
  public warn(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.WARNING,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("warn-symbol")
      }
    })
  }
  public success(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.SUCCESS,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("success-symbol")
      }
    })
  }
  public error(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.ERROR,
      predefinedValues: {
        "log-symbol": this.getPredefinedValue("error-symbol")
      }
    })
  }
  public write(msg: LoggerMessage){
    for (let pipe of this.pipes) pipe.write(cloneDeep(msg))
    if (!(msg.level & this.logLevel) || this.areMessagesMuted) msg.muted = true
    for (let transport of this.transports) transport.post(msg)
    return this
  }
  public createCopy(options: Partial<LoggerConstructorOptions> = {}): Logger{
    const clone = new Logger({
      predefinedValues: Object.fromEntries(this.predefinedValues.entries()),
      replacer: this.replacer,
      transports: this.transports
    })
    clone.setLogFormat(options.format ?? this.logFormat)
    clone.setLogLevel(options.logLevel ?? this.logLevel)
    clone.pipe(this).mute()
    for (let entry of this.predefinedValues.entries()) clone.setPredefinedValue(...entry)
    return clone
  }
  public pipe(logger: Logger){
    const pipe = new Pipe(this, logger)
    this.pipes.push(pipe)
    return pipe
  }
  public setLogFormat(format?: string): Logger{
    this.logFormat = format || Logger.defaultFormat
    return this
  }
  public setLogLevel(level: number) {
    this.logLevel = level
    return this
  }
  public getLogFormat(){
    return this.logFormat
  }
  public addTransport(transport: Transport): Logger{
    this.transports.push(transport)
    return this
  }
  public muteMessages(){
    this.areMessagesMuted = true
  }
  public unmuteMessages(){
    this.areMessagesMuted = false
  }
  public setPredefinedValue(key: string, value: PredefinedValue): Logger{
    this.predefinedValues.set(key, value)
    return this
  }
  public getPredefinedValue(key: string): PredefinedValue | undefined {
    return this.predefinedValues.get(key)
  }
  public removePredefinedValue(key: string): Logger {
    this.predefinedValues.delete(key)
    return this
  }
  public getId(): string {
    return this.id+''
  }
  public getPipes(): Iterable<Pipe> {
    return this.pipes.values()
  }
}

