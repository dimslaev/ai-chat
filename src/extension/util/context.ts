export namespace Context {
  export class NotFound extends Error {
    constructor(public readonly name: string) {
      super(`No context found for ${name}`);
    }
  }

  export function create<T>(name: string) {
    let currentValue: T | undefined = undefined;

    return {
      use(): T {
        if (!currentValue) {
          throw new NotFound(name);
        }
        return currentValue;
      },
      provide<R>(value: T, fn: () => R): R {
        const previousValue = currentValue;
        currentValue = value;
        try {
          return fn();
        } finally {
          currentValue = previousValue;
        }
      },
      async provideAsync<R>(value: T, fn: () => Promise<R>): Promise<R> {
        const previousValue = currentValue;
        currentValue = value;
        try {
          return await fn();
        } finally {
          currentValue = previousValue;
        }
      },
    };
  }
}
