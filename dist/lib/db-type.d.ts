export interface FieldDef {
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
}
export interface QueryResultRow {
    [column: string]: any;
}
export interface QueryResultBase {
    command: string;
    rowCount: number;
    oid: number;
    fields: FieldDef[];
}
export interface QueryResult<R extends QueryResultRow = any> extends QueryResultBase {
    rows: R[];
}
export declare type IoResult = {
    ret_val: number;
    ret_msg: string;
    ret_data_table?: any;
};
export declare type QResult<R extends QueryResultRow> = {
    isError: boolean;
    err?: Error;
    res?: QueryResult<R>;
};
export interface ISowDatabaseType {
    [id: string]: (...args: any[]) => any;
    getConn(): any;
    executeIo(sp: string, ctx: string, formObj: string, next: (resp: IoResult) => void): void;
    executeIoAsync(sp: string, ctx: string, formObj: string): Promise<IoResult>;
    query<R extends QueryResultRow = any>(queryText: string, values: any[], callback: (result: QResult<R>) => void): void;
    queryAsync<R extends QueryResultRow = any>(queryText: string, values: any[]): Promise<QResult<R>>;
}
