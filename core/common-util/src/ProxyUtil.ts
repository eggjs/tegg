export class ProxyUtil {
  static safeProxy<T extends object>(obj: T, getter: (obj: T, p: PropertyKey) => any) {
    return new Proxy(obj, {
      get(target: T, p: PropertyKey): any {
        if (Object.prototype[p]) {
          return target[p];
        }
        return getter(target, p);
      },
    });
  }
}
