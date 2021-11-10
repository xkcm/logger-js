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
### [`constructor(options)`](src/classes/Logger.ts#L42)

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

### [`convertToString(msgs, convertOptions)`](src/classes/Logger.ts#L69)
Helper method used to convert message segments to string.

**Parameters**
* `msgs` **{unknown[]}**: (required) Message segments.
* `convertOptions` [**{TLogger.ConvertOptions}**](#tloggerconvertoptions): (required) Convert options.

**Return value**

`string`

**Example**
```ts
logger01.convertToString([ "one", "two", "three" ], { joinChar: "+" })
```

### [`formatMessage(msg, dformat, localPredefinedValues, convertOptions)`](src/classes/Logger.ts#L76)
Helper method used to format the message object with given format, predefined values and convert options.

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