import { Logger } from ".."
import { createAutoIncrement, formatId } from "../utils"
import { TLogger } from "./Types"


const pipesInstances: Pipe[] = []
const nextPipeId = createAutoIncrement()
function newPipeId(): string {
  return formatId('pipe', nextPipeId())
}

export class Pipe {

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
  public write(msg: TLogger.MessageObject) {
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
