// 2b.25.3: minimal type shim for papaparse — the project doesn't pull
// `@types/papaparse` and only uses the streaming `parse(string)` API. If
// we ever need the File/streaming variants, install the official types.
declare module 'papaparse' {
  export interface ParseError {
    type: string
    code: string
    message: string
    row?: number
  }
  export interface ParseResult<T> {
    data: T[]
    errors: ParseError[]
    meta: {
      delimiter: string
      linebreak: string
      aborted: boolean
      truncated: boolean
      cursor: number
      fields?: string[]
    }
  }
  export interface ParseConfig {
    header?: boolean
    skipEmptyLines?: boolean | 'greedy'
    transformHeader?: (header: string) => string
    dynamicTyping?: boolean
  }
  export function parse<T = Record<string, string>>(
    input: string,
    config?: ParseConfig
  ): ParseResult<T>
  const Papa: { parse: typeof parse }
  export default Papa
}
