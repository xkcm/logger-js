import { writeFileSync, appendFileSync } from "fs"
import { createAutoIncrement, formatId } from "../utils"
import { TLogger, TTransport } from "./Types"

const transportInstances: Transport[] = []
const nextTransportId = createAutoIncrement()
function newTransportID(id?: TTransport.ID): TTransport.ID {
  if (id && !transportInstances.some(t => t.id === id)) return id
  return newTransportID(formatId('transport', nextTransportId()))
}

export class Transport<Context = unknown> {
  private definedMethods = new Map<TTransport.DefinedMethodKey, TTransport.DefinedMethod>()
  private enabled: boolean = true
  public context: Context
  public id: TTransport.ID

  static builtin = {
    Console<C>(context?: C): Transport {
      const transport = new Transport<C>({ context })
      transport.setMethod('write', (msg) => {
        if (!msg.muted) process.stdout.write(msg.content.formatted)
      })
      return transport
    },
    File<C>({ filepath, context }: { filepath: string, context?: C }): Transport {
      const transport = new Transport({ context })
      writeFileSync(filepath, `# File autogenerated by logger-js [${new Date().toISOString()}]\n`)
      transport.setMethod('write', (msg) => {
        if (!msg.muted) appendFileSync(filepath, msg.content.plain)
      })
      return transport
    }
  }

  constructor(opts: TTransport.ConstructorOptions<Context> = {}) {
    this.context = opts.context
    this.id = newTransportID(opts.id)
    transportInstances.push(this)
  }
  public post(msg: TLogger.MessageObject) {
    if (this.enabled) {
      if (this.definedMethods.has("write")) {
        const cb = this.definedMethods.get("write")
        cb(msg, this.context)
        return true
      } else return false
    } else return false
  }
  public setMethod(key: TTransport.DefinedMethodKey, callback: TTransport.DefinedMethod<Context>, opts?: { force: boolean }): boolean {
    if (this.definedMethods.has(key) && !opts.force) return false
    this.definedMethods.set(key, callback)
    return true
  }
  public removeMethod(key): boolean {
    return this.definedMethods.delete(key)
  }
  public disable() { return this.enabled = false }
  public enable() { return this.enabled = true }
}