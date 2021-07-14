export class ObjectUtils {
  static getProperties(obj: object): string[] {
    const properties: string[] = [];
    do {
      for (const property of Object.getOwnPropertyNames(obj)) {
        properties.push(property);
      }
    } while ((obj = Object.getPrototypeOf(obj)) && obj !== Object.prototype);
    return properties;
  }

  static getFunctionArgNameList(func: Function): string[] {
    if (func.length === 0) {
      return [];
    }
    let sourcecode = func.toString();
    sourcecode = sourcecode
      // Remove /* ... */
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove //
      .replace(/\/\/(.)*/g, '')
      // Remove { ... }
      .replace(/{[\s\S]*}/, '')
      // Remove =>
      .replace(/=>/g, '')
      .trim();
    let argsString = sourcecode.substring(sourcecode.indexOf('(') + 1, sourcecode.length - 1);
    // Remove =(...,...)
    argsString = argsString.replace(/=\([\s\S]*\)/g, '');
    const args = argsString.split(',');
    const argNames = args.map(arg => {
      // Remove default value
      return arg.replace(/=[\s\S]*/g, '').trim();
    }).filter(arg => arg.length);
    return argNames;
  }
}
