import { chalkTaggedTemplate, createAutoIncrement, type } from "./utils"
import { cloneDeep } from "lodash"
import { DefinedMethods, LoggerMessage, ReplacerFn, PredefinedValue, LoggerOpts } from "./types"

export class Adapter {

  static Console = new Adapter("console-adapter", {
    write: s => {
      if (!s.muted) process.stdout.write(s.content.formatted)
    }
  })

  private isEnabled: boolean = true
  constructor(public readonly id, private definedMethods: DefinedMethods, public context: object = {}){}
  public write(msg: LoggerMessage){
    if (this.isEnabled)
      this.definedMethods.write?.(msg, this.context)
  }
  public disable(){
    this.isEnabled = false
  }
  public enable(){
    this.isEnabled = true
  }
}

export class Transport {
  constructor(private adapters: Adapter[]){}
  public post(msg: LoggerMessage){
    for (let adapter of this.adapters){
      adapter.write(msg)
    }
  }
  public getAdapter(id: string): Adapter | undefined{
    return this.adapters.find(adapter => adapter.id === id)
  }
  public getAdapters(){
    return this.adapters
  }
  public removeAdapter(id: string): Adapter{
    return this.adapters.splice(this.adapters.findIndex(adapter => adapter.id === id), 1)[0]
  }
  public addAdapter(adapter: Adapter){
    this.adapters.push(adapter)
  }
  public disableAdapter(adapterId: string) {
    this.getAdapter(adapterId)?.disable()
  }
  public enableAdapter(adapterId: string) {
    this.getAdapter(adapterId)?.enable()
  }
}

const declaredLoggers: Set<string> = new Set()
const nextLoggerId = createAutoIncrement()

export class Pipe {
  static Declared: Pipe[] = []

  private muted = false
  private unmutingMessages = false

  constructor(private sender: Logger, private receiver: Logger){
    const f = Pipe.Declared.find(pipe =>
      pipe.sender.getId() === sender.getId() && pipe.receiver.getId() === receiver.getId()
    )
    if (f !== undefined) return f
    else Pipe.Declared.push(this)
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

  constructor(public transport: Transport, opts?: LoggerOpts){
    this.id = opts?.id ?? `logger0x${nextLoggerId().toString(16)}`
    declaredLoggers.add(this.id)
    this.replacer = opts?.replacer || ((a, b, i, msgs) => {
      a += typeof b === "string" ? b : JSON.stringify(b)
      if ( i != msgs.length-1) a += ' '
      return a
    })
    if (opts?.customPostfix) this.setPostfix(opts.customPostfix)
    if (opts?.customPrefix) this.setPrefix(opts.customPrefix)
    if (opts?.predefinedValues) Object.entries(opts.predefinedValues).forEach(([k, v]) => {
      this.predefinedValues.set(k, v)
    })
  }
  public convertToString(msgs: any[]){
    if (type(msgs) !== 'array') msgs = [msgs]
    return msgs.reduce(this.replacer.bind(this), '')
  }
  public formatMessage(msg: LoggerMessage, dformat = this.logFormat, localPredefinedValues: { [key: string]: PredefinedValue } = {}){
    const evalPredefinedValue = (val: PredefinedValue, msg: string) => {
      return typeof val === 'function' ? this.convertToString(val(msg)) : this.convertToString(val)
    }
    const stringMsg = this.convertToString(msg.content.raw)
    const formatValues: Map<string, string> = new Map([
      ...([...this.predefinedValues.entries()].map(([k, v]) => {
        return [k.startsWith("%") ? k : "%" + k, evalPredefinedValue(v, stringMsg)] as [string, string]
      })),
      ...(Object.entries(localPredefinedValues).map(([k, v]) => {
        return [k.startsWith("%") ? k : "%" + k, evalPredefinedValue(v, stringMsg)] as [string, string]
      })),
      ["%msg", stringMsg]
    ])
    const format = dformat.replace(/(%[a-zA-Z0-9_-]+)/g, (found) => {
      if (formatValues.has(found)) return formatValues.get(String(found))
      return found
    })

    return chalkTaggedTemplate`${format}`
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
        "log-symbol": this.predefinedValue("info-symbol")
      }
    })
  }
  public warn(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.WARNING,
      predefinedValues: {
        "log-symbol": this.predefinedValue("warn-symbol")
      }
    })
  }
  public success(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.SUCCESS,
      predefinedValues: {
        "log-symbol": this.predefinedValue("success-symbol")
      }
    })
  }
  public error(...msgs: any[]){
    this.logOptions(msgs, {
      level: Logger.ERROR,
      predefinedValues: {
        "log-symbol": this.predefinedValue("error-symbol")
      }
    })
  }
  public write(msg: LoggerMessage){
    for (let pipe of this.pipes) pipe.write(cloneDeep(msg))
    if (!(msg.level & this.logLevel) || this.areMessagesMuted) msg.muted = true
    this.transport.post(msg)
    return this
  }
  public createCopy(options: Partial<LoggerOpts & { format: string, logLevel: number }> = {}): Logger{
    const clone = new Logger(this.transport, {
      ...options,
      customPostfix: this.predefinedValue("post"),
      customPrefix: this.predefinedValue("pre"),
      predefinedValues: this.predefinedValues,
      replacer: this.replacer
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
  public setPrefix(prefix: PredefinedValue): Logger{
    this.setPredefinedValue("pre", prefix)
    return this
  }
  public setPostfix(postfix: PredefinedValue): Logger{
    this.setPredefinedValue("post", postfix)
    return this
  }
  public clearPrefix(): Logger{
    this.setPredefinedValue("pre", '')
    return this
  }
  public clearPostfix(): Logger{
    this.setPredefinedValue("post", '')
    return this
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
  public setTransport(transport: Transport): Logger{
    this.transport = transport
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
  public predefinedValue(key: string): PredefinedValue | undefined {
    return this.predefinedValues.get(key)
  }
  public removePredefinedValue(key: string): Logger{
    this.predefinedValues.delete(key)
    return this
  }
  public getId(): string {
    return this.id+''
  }
  public getPipes(): Pipe[] {
    return [...this.pipes.values()]
  }
}

export function combineTransports(...transports: Transport[]){
  const CombinedTransport = new Transport([
    ...transports.flatMap(t => t.getAdapters())
  ])
  return CombinedTransport
}
