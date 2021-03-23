export type PredefinedValue = any | ((string?) => any)
export type PredefinedValuesObject = {
  [key: string]: PredefinedValue
}
export type ReplacerFn = (a: string, b: unknown, index?: number, array?: any[]) => string
export type LoggerOpts = Partial<{
  customPrefix: PredefinedValue;
  customPostfix: PredefinedValue;
  replacer: ReplacerFn;
  predefinedValues: PredefinedValuesObject;
  id: string;
}>
export type LoggerMessage = {
  content: {
    raw: any[];
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
export type DefinedMethod = (msg: LoggerMessage, context?: any) => void | any
export type DefinedMethodsKeys = "write" | "writeLine" | "writeLines"
export type DefinedMethods = Partial<{
  [key in DefinedMethodsKeys]: DefinedMethod;
}>
