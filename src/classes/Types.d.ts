import { Transport } from "./Transport"

export namespace TTransport{
  export type ID = string
  export type DefinedMethod<Context = unknown> = (msg: TLogger.MessageObject, context?: Context) => void | unknown
  export type DefinedMethodKey = "write"
  export type ConstructorOptions<Context = unknown> = {
    context?: Context;
    id?: string;
  }
}
export namespace TLogger {
  export type ID = string
  export type PredefinedValue = ((msg?: MessageObject) => string) | string
  export type PredefinedValuesObject = Record<string, PredefinedValue>
  export type Reducer = (convertOptions: ConvertOptions) => (a: string, b: unknown, index?: number, array?: unknown[]) => string
  export type ConstructorOptions = {
    transports: Record<TTransport.ID, Transport>;
    replacer?: Reducer;
    predefinedValues?: PredefinedValuesObject;
    id?: string;
    format?: string;
    logLevel?: number;
    customLevels?: string[];
  }
  export type MessageObject = {
    content: {
      passedSegments: unknown[];
      joinedSegments: string;
      formatted?: string;
      plain?: string;
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
  export type ConvertOptions = {
    joinChar?: string;
  }
}