declare module 'pg' {
  export type QueryResultRow = Record<string, unknown>
  export interface QueryResult<T = QueryResultRow> {
    rows: T[]
    rowCount: number | null
  }
  export class Client {
    constructor(config?: { connectionString?: string; ssl?: boolean | { rejectUnauthorized?: boolean } })
    connect(): Promise<void>
    end(): Promise<void>
    query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ): Promise<QueryResult<T>>
  }
  const pg: { Client: typeof Client }
  export default pg
}
