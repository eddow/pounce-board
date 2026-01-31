
export type ExtractPathParams<T extends string> =
  T extends `${string}[...${infer Param}]`
    ? { [K in Param]: string[] } & ExtractPathParams<
        T extends `${infer Prefix}[...${Param}]` ? Prefix : never
      >
    : T extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param]: string } & ExtractPathParams<Rest>
    : {};

export type InferHandlerOutput<T> = T extends (
  ...args: any[]
) => Promise<infer R>
  ? R extends { data?: infer D }
    ? D
    : never
  : never;
