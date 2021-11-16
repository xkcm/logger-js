# logger-js
## Description

This library provides an advanced *JavaScript/TypeScript* logger with:
* custom logs formatting and available chalk formatting,
* usage of predefined variables inserted into the log format,
* custom message handling with provided built-in *console* and *file* transports,
* an ability to pipe messages from one `Logger` instance to other,
* custom message level system.
## Structure
Every `Logger` instance distributes `Message` objects to attached `Transport` objects. `Logger` instance needs at least one `Transport` instance that can be defined by initialization. `Logger` instance can also pipe its messages to other `Logger` instances. `Transport` instance handles outputting the message in the custom way. The image below represents the `logger-js` structure.

![structure](https://i.imgur.com/CiixjA7.png)

## Example

The example below shows an initialization of the `Logger` instance and creating a default `Console` transport.

```ts
const logger01 = new Logger({
  transports: {
    consoleTransport: Transport.builtin.Console()
  }
})
```

To log something you can use `Logger` methods: `.log()`, `.info()`, `.success()`, `.warn()`, `.error()`, each one corresponds to the built-in message level (`info` and `log` are equivalent).

```ts
logger01.log("this is", "a test message") // "this is a test message\n"
logger01.error("error occurred!") // "error occurred!\n"
logger01.warn("this is a warning") // "this is a warning\n"
```

## API
## [`Logger`](src/classes/Logger.ts)
This class is responsible for handling message objects, formatting logs and piping to other `Logger` instances.
### [`Logger#constructor(options)`](src/classes/Logger.ts#L42)

**Parameters**
* `options` [**{TLogger.ConstructorOptions}**](#tloggerconstructoroptions): (required) Constructor options used to initialize the `Logger` instance

**Return value**

`Logger` instance.

**Example**
```ts
const logger01 = new Logger({
  transports: {
    consoleTransport: Transport.builtin.Console()
  }
})
```

### [`Logger#convertToString(msgs, convertOptions)`](src/classes/Logger.ts#L69)
Helper method used to convert message segments to string. This is a low-level method and should not be used in an application.

**Parameters**
* `msgs` **{unknown[]}**: (required) Message segments.
* `convertOptions` [**{TLogger.ConvertOptions}**](#tloggerconvertoptions): (required) Convert options.

**Return value**

`string`

**Example**
```ts
logger01.convertToString([ "one", "two", "three" ], { joinChar: "+" })
```

### [`Logger#formatMessage(msg, dformat, localPredefinedValues, convertOptions)`](src/classes/Logger.ts#L76)
Helper method used to format the message object with given format, predefined values and convert options. This is a low-level method and should not be used in an application.

**Parameters**
* `msg` [**{TLogger.MessageObject}**](#tloggermessageobject): (required) Message object.
* `dformat` **{string}**: (optional) Format string.
* `localPredefinedValues` [**{TLogger.PredefinedValuesObject}**](#tloggerpredefinedvaluesobject): (optional) Custom predefined values.
* `convertOptions` [**{TLogger.ConvertOptions}**](#tloggerconvertoptions): (optional) Convert options for predefined values.

**Return value**

`string`

**Example**

```ts
logger01.formatMessage({
  content: {
    joinedSegments: "one+two+three"
  }
}, "%msg [%date] %local", { local: "ThisIsLocalPredefinedValue" })
```

### [`Logger#logWithOptions(raw, options, convertOptions)`](src/classes/Logger.ts#L102)
Low-level method used to log raw segments with message and convert options.

**Parameters**
* `raw` **{unknown[]}**: (required) Raw message segments.
* `options` [**{Partial<TLogger.MessageObject>}**](#tloggermessageobject): (optional) Picked message options.
* `convertOptions` [**{TLogger.ConvertOptions}**](#tloggerconvertoptions): (optional) Convert options.

**Return value**

`Logger` instance.

**Example**
```ts
logger01.logWithOptions(["one", "two", "three"], {
  level: logger01.levels.get('INFO')
}, { joinChar: '-' })
```

### [`Logger#log(...msgs)`](src/classes/Logger.ts#L125)
Alias for [`info(...msgs)`](#loggerinfomsgs)
### [`Logger#info(...msgs)`](src/classes/Logger.ts#L126)
Method used for logging with level `INFO`.

**Parameters**
* `...msgs` **{unknown[]}**: (required) Contents to log.

**Return value**

`Logger` instance

**Example**
```ts
logger01.info("hello", "from logger01")
```

### [`Logger#warn(...msgs)`](src/classes/Logger.ts#L132)
Method used for logging with level `WARNING`.

**Parameters**
* `...msgs` **{unknown[]}**: (required) Contents to log.

**Return value**

`Logger` instance.

**Example**
```ts
logger01.warn("watch out!")
```

### [`Logger#success(...msgs)`](src/classes/Logger.ts#L138)
Method used for logging with level `SUCCESS`.

**Parameters**
* `...msgs` **{unknown[]}**: (required) Contents to log.

**Return value**

`Logger` instance.

**Example**
```ts
logger01.error("error!")
```

### [`Logger#postMessage(msg)`](src/classes/Logger.ts#L150)
Method used for passing the message object to the transports.

**Parameters**
* `msg` [**{TLogger.MessageObject}**](#tloggermessageobject): (required) Complete message object.

**Return value**

`Logger` instance

**Example**
```ts
logger01.postMessage({
  content: {
    passedSegments: ["one", "two", "three"],
    joinedSegments: "one+two+three",
    formatted: "one+two+three",
    plain: "one+two+three"
  },
  level: logger01.levels.get('ALL'),
  ...
})
```

### [`Logger#createCopy(options)`](src/classes/Logger.ts#L157)
Method that creates a copy of the `Logger` instance.

**Parameters**
* `options` [**{Partial<TLogger.ConstructorOptions>}**](#tloggerconstructoroptions): (optional) Additional constructor options for the copy.

**Return value**

new `Logger` instance

**Example**
```ts
const logger01copy = logger01.createCopy({
  id: "logger01-copy"
})
```

### [`Logger#pipe(logger)`](src/classes/Logger.ts#L173)
Method used for creating a `Pipe` instance connected to another `Logger` instance.

**Parameters**
* `logger` **{Logger}**: (required) Destination `Logger` instance.

**Return value**

`Pipe` instance

**Example**
```ts
logger01.pipe(logger01copy)
```

### [`Logger#getPipes()`](src/classes/Logger.ts#L178)
Returns array of pipes.

**Parameters**

`Logger#getPipes()` takes no parameters.

**Return value**

`Pipe[]`

**Example**

```ts
logger01.getPipes() // [Pipe(sender=logger01, receiver=logger01copy)]
```

### [`Logger#removePipe(pipeId)`](src/classes/Logger.ts#L181)
Removes pipe from the `Logger` instance.

**Parameters**
* `pipeId` **{string}**: (required) `Pipe` instance identifier.

**Return value**

Removed `Pipe` instance.

**Example**
```ts
logger01.removePipe(logger01.getPipes()[0].getId())
```

### [`Logger#setFormat(format)`](src/classes/Logger.ts#L186)
Sets a new format string for the `Logger` instance or sets it to the `Logger.DEFAULT_FORMAT_STRING` if `format` parameter is not passed.

**Parameters**
* `format` **{string}**: (optional) Format string.

**Return value**

`Logger` instance

**Example**
```ts
logger01.setFormat("[NEW_FORMAT] %msg")
```

### [`Logger#getFormat()`](src/classes/Logger.ts#L190)
Returns the current format string.

**Parameters**

`Logger#getFormat()` takes no parameters.

**Return value**

`string`

**Example**

```ts
logger01.getFormat()
```

### [`Logger#setLevel(level)`](src/classes/Logger.ts#L194)
Sets new logging level.

**Parameters**
* `level` **{number}**: (required) Logging level.

**Return value**

`Logger` instance

**Example**
```ts
logger01.setLevel(logger01.levels.get('INFO') | logger01.levels.get('ERROR'))
```

### [`Logger#getLevel()`](src/classes/Logger.ts#L198)
Returns current logging level.

**Parameters**

`Logger#getLevel()` takes no parameters.

**Return value**

`number`

**Example**

```ts
logger01.getLevel() // 0b1001
```

### [`Logger#addTransport(key, transport)`](src/classes/Logger.ts#L203)
Adds a new transport.

**Parameters**
* `key` **{string}**: (required) Key used to identify the `Transport` instance in the `Logger` instance.
* `transport` **{Transport}**: (required) `Transport` instance.

**Return value**

`Logger` instance

**Example**
```ts
logger01.addTransport("consoleTransport2", Transport.builtin.Console())
```

### [`Logger#getTransports()`](src/classes/Logger.ts#L208)
Returns an array of `Transport` instance registered in the `Logger` instance.

**Parameters**

`Logger#getTransports()` takes no parameters.

**Return value**

`[{ key: string, transport: Transport }]`

**Example**
```ts
logger01.getTransports()
```

### [`Logger#removeTransport(key)`](src/classes/Logger.ts#L211)
Removes `Transport` instance from the `Logger` instance by given `key`.

**Parameters**
* `key` **{string}**: (required) `Transport` instance identifier.

**Return value**

`Logger` instance

**Example**
```ts
logger01.removeTransport("consoleTransport")
```

### [`Logger#muteMessages()`](src/classes/Logger.ts#L216)
Mutes all messages.

**Parameters**

`Logger#muteMessages()` takes no parameters.

**Return value**

`boolean` (current `Logger#areMessagesMuted` property value)

**Example**
```ts
logger01.muteMessages()
```

### [`Logger#unmuteMessages()`](src/classes/Logger.ts#L217)
Disables muting all messages.

**Parameters**

`Logger#unmuteMessages()` takes no parameters.

**Return value**

`boolean` (current `Logger#areMessagesMuted` property value)

**Example**
```ts
logger01.unmuteMessages()
```

### [`Logger#isMuted()`](src/classes/Logger.ts#L218)
Returns current value of the `Logger#areMessagesMuted` property.

**Parameters**

`Logger#isMuted()` takes no parameters.

**Return value**

`boolean` (current value of the `Logger#areMessagesMuted` property)

**Example**
```ts
logger01.isMuted() // false
```

### [`Logger#setPredefinedValue(key, value)`](src/classes/Logger.ts#L221)
Sets new predefined value for the `Logger` instance.

**Parameters**
* `key` **{string}**: (required) Name of the predefined value.
* `value` **{PredefinedValue}**: (required) Predefined value.

**Return value**

`Logger` instance

**Example**
```ts
logger01.setPredefinedValue("%random", () => Math.random())
```

### [`Logger#getPredefinedValue(key)`](src/classes/Logger.ts#L225)
Returns predefined value by given key.

**Parameters**
* `key` **{string}**: (required) Predefined value key

**Return value**

[`TLogger.PredefinedValue`](#tloggerpredefinedvalue)

**Example**
```ts
logger01.getPredefinedValue("%random")
```

### [`Logger#removePredefinedValue(key)`](src/classes/Logger.ts#L228)
Removes a predefined value by given key.

**Parameters**
* `key` **{string}**: (required) Predefined value key

**Return value**

`Logger` instance

**Example**
```ts
logger01.removePredefinedValue("%random").removePredefinedValue("%something")
```

### [`Logger#getId()`](src/classes/Logger.ts#L234)
Returns `Logger` identifier.

**Parameters**

`Logger#getId()` takes no parameters.

**Return value**

`string`

**Example**
```ts
logger01.getId()
```

### [`Logger#getPipe(id)`](src/classes/Logger.ts#L238)
Returns `Pipe` instance by given identifier.

**Parameters**
* `id` **{string}**: (required) `Pipe` identifier.

**Return value**

`Pipe instance`

**Example**
```ts
logger01.getPipe("pipe-identifier")
```

## [`LevelManager`](src/classes/LevelManager.ts)
Class used for managing message levels. This class is automatically instantiated when creating a new `Logger` instance, it should not be used standalone.

### [`LevelManager#add(name)`](src/classes/LevelManager.ts#L15)
Adds a new message level with given `name`.

**Parameters**
* `name` **{string}**: (required) Message level name.

**Return value**

`number`

**Example**
```ts
logger01.levels.add("CUSTOM_LEVEL")
```

### [`LevelManager#get(...names)`](src/classes/LevelManager.ts#L21)
Returns number with combined message levels by given `names`.

**Parameters**
* `...names` **{string[]}**: (required) Message levels names.

**Return value**

`number`

**Example**
```ts
logger01.levels.get("INFO", "SUCCESS")
```

### [`LevelManager#getLevelNames()`](src/classes/LevelManager.ts#L30)
Returns all registered level names.

**Parameters**

`LevelManager#getLevelNames()` takes no parameters.

**Return value**

`string[]`

**Example**
```ts
logger01.levels.getLevelNames()
```

## [`Transport`](src/classes/Transport.ts)
Class used for creating message output channels and handlers.

### [`Transport.builtin.Console(context)`](src/classes/Transport.ts#L19)
Static built-in method used for creating a `Transport` instance which outputs messages to the console.

**Parameters**
* `context` **{object}**: (optional) Transport context.

**Return value**

`Transport` instance.

**Example**
```ts
const consoleTransport = Transport.builtin.Console({ transportDetails: { ... } })
```

### [`Transport.builtin.File({ filepath, context })`](src/classes/Transport.ts#L26)
Static built-in method used for creating a `Transport` instance which writes messages to the filesystem.

**Parameters**
* `filepath` **{string}**: (required) Path to the file.
* `context` **{object}**: (optional) Transport context.

**Return value**

`Transport` instance.

**Example**
```ts
const fileTransport = Transport.builtin.File({ filepath: "/path/to/the/file", context: { ... } })
```

### [`Transport#constructor(options)`](src/classes/Transport.ts#L36)

**Parameters**
* `options` [**{TTransport.ConstructorOptions\<Context>}**](#ttransportconstructoroptionscontext): (required) Options for creating a `Transport` instance.

**Return value**

`Transport` instance.

**Example**
```ts
const transport01 = new Transport({
  context: { someDetails: { ... } },
  id: "optional-id"
})
```

### [`Transport#post(message)`](src/classes/Transport.ts#L41)
Method used for outputting the `MessageObject`. It is used inside the `Logger` class, it should not be used standalone.

**Parameters**
* `message` [**{TLogger.MessageObject}**](#tloggermessageobject): (required) Message object passed from `Logger` class.

**Return value**

`boolean` (`true` if outputted correctly, `false` otherwise)

**Example**
```ts
transport01.post({ ... })
```

### [`Transport#setMethod(key, callback)`](src/classes/Transport.ts#L50)
It is used for registering the output handler.

**Parameters**
* `key` **{"write"}**: (required) Handler key.
* `callback` [**{TTransport.DefinedMethod\<Context>}**](#ttransportdefinedmethodcontext): (required) Handler function.

**Return value**

`boolean` (`true` if set correctly, `false` otherwise)

**Example**
```ts
transport01.setMethod("write", (msg) => console.log(msg))
```

### [`Transport#removeMethod(key)`](src/classes/Transport.ts#L55)
Removes output handler by given key.

**Parameters**
* `key` **{"write"}**: (required) Handler key.

**Return value**

`boolean` (`true` if removed, `false` otherwise)

**Example**
```ts
transport01.removeMethod("write")
```

### [`Transport#disable()`](src/classes/Transport.ts#L58)
Disables transport.

**Parameters**

`Transport#disable()` takes no parameters.

**Return value**

`boolean` (`Transport#enabled` value)

**Example**
```ts
transport01.disable()
```

### [`Transport#enable()`](src/classes/Transport.ts#L59)
Enables transport.

**Parameters**

`Transport#enable()` takes no parameters.

**Return value**

`boolean` (`Transport#enabled` value)

**Example**
```ts
transport01.enable()
```

## [`Pipe`](src/classes/Pipe.ts)
Class used for piping messages from one `Logger` to another.
### [`Pipe#mute()`](src/classes/Pipe.ts#L31)
Mutes `Pipe` instance.

**Parameters**

`Pipe#mute()` takes no parameters.

**Return value**

`Pipe` instance

**Example**
```ts
logger01.getPipe("pipe-identifier").mute()
```

### [`Pipe#unmute()`](src/classes/Pipe.ts#L35)
Unutes `Pipe` instance.

**Parameters**

`Pipe#unmute()` takes no parameters.

**Return value**

`Pipe` instance

**Example**
```ts
logger01.getPipe("pipe-identifier").unmute()
```

### [`Pipe#enableUnmutingMessages()`](src/classes/Pipe.ts#L39)
Enables unmuting messages going through the `Pipe` instance.

**Parameters**

`Pipe#enableUnmutingMessages()` takes no parameters.

**Return value**

`Pipe` instance

**Example**
```ts
logger01.getPipe("pipe-identifier").enableUnmutingMessages()
```

### [`Pipe#disableUnmutingMessages()`](src/classes/Pipe.ts#L43)
Disables unmuting messages going through the `Pipe` instance.

**Parameters**

`Pipe#disableUnmutingMessages()` takes no parameters.

**Return value**

`Pipe` instance

**Example**
```ts
logger01.getPipe("pipe-identifier").disableUnmutingMessages()
```

### [`Pipe#destroy()`](src/classes/Pipe.ts#L47)
Destroys `Pipe` instance and stops piping messages.

**Parameters**

`Pipe#destroy()` takes no parameters.

**Return value**

`Pipe` instance.

**Example**
```ts
logger01.getPipe("pipe-identifier").destroy()
```

### [`Pipe#getId()`](src/classes/Pipe.ts#L54)
Returns `Pipe` identifier.

**Parameters**

`Pipe#getId()` takes no parameters.

**Return value**

`string`

**Example**
```ts
logger01.getPipe("pipe-identifier").getId()
```

### [`Pipe#isMuted()`](src/classes/Pipe.ts#L57)

**Parameters**

`Pipe#isMuted()` takes no parameters.

**Return value**

`boolean` (`Pipe#muted` value)

**Example**
```ts
logger01.getPipe("pipe-identifier").isMuted()
```

### [`Pipe#doesUnmuteMessages()`](src/classes/Pipe.ts#L60)
**Parameters**

`Pipe#doesUnmuteMessages()` takes no parameters.

**Return value**

`boolean` (`Pipe#unmutingMessages` value)

**Example**
```ts
logger01.getPipe("pipe-identifier").doesUnmuteMessages()
```

## Interfaces and types
### [`TLogger.ConstructorOptions`](src/classes/Types.d.ts#L17)
Type including all constructor options necessary to initialize the `Logger` instance.
```ts
type ConstructorOptions = {
  transports: Record<TTransport.ID, Transport>;
  replacer?: Reducer;
  predefinedValues?: PredefinedValuesObject;
  id?: string;
  format?: string;
  logLevel?: number;
  customLevels?: string[];
}
```
* `transport` *(required)* - Object containing `Transport` instances used to handle messages.
* `replacer` *(optional, default=`Logger.DEFAULT_REDUCER`)* - `Reducer` function used in string conversion.
* `predefinedValues` *(optional)* - Object containing custom `PredefinedValue` pairs.
* `id` *(optional, default=autogenerated)* - Logger identifier.
* `format` *(optional, default=`Logger.DEFAULT_FORMAT_STRING`)* - Custom logging format.
* `logLevel` *(optional, default=ALL)* - Allowed level for messages.
* `customLevels` *(optional)* - Custom message levels added to the logger's `LevelManager`.

### [`TLogger.PredefinedValuesObject`](src/classes/Types.d.ts#L15)
Object containing key-based `PredefinedValue` values.
```ts
type PredefinedValuesObject = Record<string, PredefinedValue>
```
### [`TLogger.PredefinedValue`](src/classes/Types.d.ts#L14)
`PredefinedValue` can either be a string or a callback that returns a string. A callback receives `MessageObject` as a parameter.
```ts
type PredefinedValue = ((msg?: MessageObject) => string) | string
```
### [`TLogger.MessageObject`](src/classes/Types.d.ts#L26)
`MessageObject` contains all the information about the logged message. This object is posted to the `Transport` instances.
```ts
type MessageObject = {
  content: {
    passedSegments: unknown[];
    joinedSegments: string;
    formatted?: string;
    plain?: string;
  };
  level: number;
  sourceLogger: string;
  predefinedValues?: PredefinedValuesObject;
  muted?: boolean;
  separateLines?: boolean;
  endl?: boolean;
  format?: string;
}
```
* `content.passedSegments` - Contains raw message segments that was passed to the logging method.
* `content.joinedSegments` - Raw message segments joined using string conversion and `Reducer` function.
* `content.formatted` - Joined segments combined with the `Logger` format and *chalk* formatting.
* `content.plain` - Same as `content.formatted` but without *chalk* formatting.
* `level` - Message level number.
* `sourceLogger` - Source logger of the message.
* `predefinedValues` - Additional `PredefinedValuesObject`.
* `muted` - Flag indicating that the message is muted and *should not* be output.
* `separateLines` - Flag indicating that the message segments should be displayed in separate lines **(WIP)**.
* `endl` - Flag indicating that the new line character should be added at the end of the formatted message.
* `format` - Custom format that is used instead of the one declared in the `Logger` instance.

### [`TLogger.Reducer`](src/classes/Types.d.ts#L16)
Reducer function used in messages string conversion.
```ts
type Reducer = (convertOptions: ConvertOptions) =>
  (a: string, b: unknown, index?: number, array?: unknown[]) => string
```

### [`TLogger.ConvertOptions`](src/classes/Types.d.ts#L42)
Options object for the string conversion.
```ts
type ConvertOptions = {
  joinChar?: string;
}
```
* `joinChar` *(optional, default=" ")* - Char used to concatenate message segments. 

### [`TTransport.ConstructorOptions<Context>`](src/classes/Types.d.ts#L7)
Options object for creating the `Transport` instance.
```ts
type ConstructorOptions<Context = unknown> = {
  context?: Context;
  id?: string;
}
```
* `context` *(optional, default={})* - `Transport` context object.
* `id` *(optional, default=autogenerated)* - Custom `Transport` identifier.

### [`TTransport.DefinedMethod<Context>`](src/classes/Types.d.ts#L5)
Handler function definition.
```ts
type DefinedMethod<Context = unknown> = (msg: TLogger.MessageObject, context?: Context) => void | unknown
```