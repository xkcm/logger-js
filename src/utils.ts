import chalk from 'chalk'

export const type: (a: any) => string = (a) => ({}).toString.call(a).match(/\s([a-zA-Z]+)/)[1].toLowerCase()

export function chalkTaggedTemplate(parts, ...substitutions) {
  const rawResults = [];
  const cookedResults = [];
  for (var i = 0; i < parts.length; i++) {
    rawResults.push(parts.raw[i]);
    cookedResults.push(parts[i]);
    if (i < substitutions.length) {
      rawResults.push(substitutions[i]);
      cookedResults.push(substitutions[i]);
    }
  }

  const chalkParts = [cookedResults.join("")] as any;
  chalkParts.raw = [rawResults.join("")];

  return (chalk(chalkParts));
}
export function unchalk(s){
  return s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export function createAutoIncrement(startValue = 0, step = 1) {
  const gen = (function*(){
    let i = startValue-step
    while (true) yield i+=step
  })()
  return () => gen.next().value
}