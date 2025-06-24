export namespace Log {
  export const Default = create({ service: "default" });

  let last = Date.now();

  export function create(tags?: Record<string, any>) {
    tags = tags || {};

    function build(message: any, extra?: Record<string, any>) {
      const prefix = Object.entries({
        ...tags,
        ...extra,
      })
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");

      const next = new Date();
      const diff = next.getTime() - last;
      last = next.getTime();

      return (
        [next.toISOString().split(".")[0], "+" + diff + "ms", prefix, message]
          .filter(Boolean)
          .join(" ") + "\n"
      );
    }

    const result = {
      info(message?: any, extra?: Record<string, any>) {
        console.log("INFO  " + build(message, extra));
      },
      error(message?: any, extra?: Record<string, any>) {
        console.error("ERROR " + build(message, extra));
      },
      warn(message?: any, extra?: Record<string, any>) {
        console.warn("WARN  " + build(message, extra));
      },
      tag(key: string, value: string) {
        if (tags) tags[key] = value;
        return result;
      },
      clone() {
        return Log.create({ ...tags });
      },
    };

    return result;
  }
}
