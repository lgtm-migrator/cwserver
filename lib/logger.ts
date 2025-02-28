// Copyright (c) 2022 Safe Online World Ltd.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// 11:26 PM 9/28/2019
// by rajib chy
import * as _fs from 'fs';
import * as _path from 'path';
import { IDispose, IBufferArray, BufferArray } from './app-static';
import * as fsw from './fsw';
export interface ILogger extends IDispose {
    isProduction: boolean;
    newLine(): any;
    write(msg: string, color?: string): ILogger;
    log(msg: string, color?: string): ILogger;
    info(msg: string): ILogger;
    success(msg: string): ILogger;
    error(msg: string): ILogger;
    reset(): ILogger;
    writeToStream(str: string): void;
    flush(): boolean;
    writeBuffer(msg: string): void;
}
export class LogTime {
    public static dfo(t: number): string {
        t = t === 0 ? 1 : t;
        return String(t <= 9 ? "0" + t : t);
    }
    public static dfm(t: number): string {
        t += 1;
        return String(t <= 9 ? "0" + t : t);
    }
    public static getLocalDateTime(offset: any): Date {
        // create Date object for current location
        const d = new Date();
        // convert to msec
        // subtract local time zone offset
        // get UTC time in msec
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        // create new Date object for different city
        // using supplied offset
        const nd = new Date(utc + (3600000 * offset));
        // return date
        return nd;
    }
    public static getTime(tz: string): string {
        const date = this.getLocalDateTime(tz);
        return `${date.getFullYear()}-${this.dfm(date.getMonth())}-${this.dfo(date.getDate())} ${this.dfo(date.getHours())}:${this.dfo(date.getMinutes())}:${this.dfo(date.getSeconds())}`;
    }
}
declare type IColor = string;
export class ConsoleColor {
    public static Cyan(str: string): IColor {
        return `\x1b[36m${str}\x1b[0m`;
    };
    public static Yellow(str: string): IColor {
        return `\x1b[33m${str}\x1b[0m`;
    };
    public static Reset: IColor = '\x1b[0m';
    public static Bright: IColor = '\x1b[1m';
    public static Dim: IColor = '\x1b[2m';
    public static Underscore: IColor = '\x1b[4m';
    public static Blink: IColor = '\x1b[5m';
    public static Reverse: IColor = '\x1b[7m';
    public static Hidden: IColor = '\x1b[8m';
    public static FgBlack: IColor = '\x1b[30m';
    public static FgRed: IColor = '\x1b[31m';
    public static FgGreen: IColor = '\x1b[32m';
    public static FgYellow: IColor = '\x1b[33m';
    public static FgBlue: IColor = '\x1b[34m';
    public static FgMagenta: IColor = '\x1b[35m';
    public static FgCyan: IColor = '\x1b[36m';
    public static FgWhite: IColor = '\x1b[37m';
    public static BgBlack: IColor = '\x1b[40m';
    public static BgRed: IColor = '\x1b[41m';
    public static BgGreen: IColor = '\x1b[42m';
    public static BgYellow: IColor = '\x1b[43m';
    public static BgBlue: IColor = '\x1b[44m';
    public static BgMagenta: IColor = '\x1b[45m';
    public static BgCyan: IColor = '\x1b[46m';
    public static BgWhite: IColor = '\x1b[47m';
}
function isString(a: any): a is string {
    return typeof (a) === "string";
}
export class ShadowLogger implements ILogger {
    private _isProduction: boolean;
    public get isProduction() {
        return this._isProduction;
    }
    constructor() {
        this._isProduction = true;
    }
    writeBuffer(msg: string): void {
        return;
    }
    newLine() {
        return;
    }
    write(msg: string, color?: IColor): ILogger {
        return this;
    }
    log(msg: string, color?: IColor): ILogger {
        return this;
    }
    info(msg: string): ILogger {
        return this;
    }
    success(msg: string): ILogger {
        return this;
    }
    error(msg: string): ILogger {
        return this;
    }
    reset(): ILogger {
        return this;
    }
    writeToStream(str: string): void {
        return;
    }
    flush(): boolean {
        return true;
    }
    dispose(): void {
        return;
    }

}
export class Logger implements ILogger {
    private _userInteractive: boolean;
    private _isDebug: boolean;
    private _canWrite: boolean;
    private _tz: string;
    private _buff: IBufferArray;
    private _blockSize: number = 0;
    private _maxBlockSize: number = 10485760; /* (Max block size (1024*1024)*10) = 10 MB */
    private _fd: number = -1;
    private _isProduction: boolean;
    public get isProduction() {
        return this._isProduction;
    }
    constructor(
        dir?: string, name?: string,
        tz?: string, userInteractive?: boolean,
        isDebug?: boolean, maxBlockSize?: number
    ) {
        this._buff = new BufferArray(); this._isProduction = false;
        this._userInteractive = typeof (userInteractive) !== "boolean" ? true : userInteractive;
        this._isDebug = typeof (isDebug) !== "boolean" ? true : isDebug === true ? userInteractive === true : isDebug;
        this._canWrite = false; this._tz = "+6";
        if (!dir) return;
        dir = _path.resolve(dir);
        if (!tz) tz = '+6';
        this._tz = tz;
        if (!_fs.existsSync(dir)) {
            fsw.mkdirSync(dir);
        }
        if (typeof (maxBlockSize) === "number") {
            this._maxBlockSize = maxBlockSize;
        }
        const date = LogTime.getLocalDateTime(this._tz);
        name = `${name || String(Math.random().toString(36).slice(2) + Date.now())}_${date.getFullYear()}_${LogTime.dfm(date.getMonth())}_${LogTime.dfo(date.getDate())}.log`;
        const path = _path.resolve(`${dir}/${name}`);
        const exists = _fs.existsSync(path);
        this._fd = _fs.openSync(path, 'a');
        this._canWrite = true;
        if (exists === false) {
            this.writeToStream(`Log Genarte On ${LogTime.getTime(this._tz)}\r\n${'-'.repeat(100)}\r\n`);
        } else {
            this.newLine();
        }
    }
    public flush(): boolean {
        if (this._fd < 0) {
            throw new Error("File not open yet....");
        }
        if (this._buff.length === 0) return false;
        _fs.appendFileSync(this._fd, this._buff.data);
        this._buff.clear();
        this._blockSize = 0;
        return true;
    }
    public writeToStream(str: string): void {
        if (this._canWrite === false) return void 0;
        this._blockSize += this._buff.push(str);
        if (this._blockSize < this._maxBlockSize) return void 0;
        return this.flush(), void 0;
    }
    public newLine(): void {
        return this.writeToStream(`${'-'.repeat(100)}\r\n`);
    }
    private _write(buffer: any): void {
        const str: string = !isString(buffer) ? buffer.toString() : buffer;
        str.split("\r\n").forEach((line) => {
            if (line && line.trim().length > 0) {
                this.writeToStream(`${LogTime.getTime(this._tz)}\t${line.replace(/\t/gi, "")}\r\n`);
            }
        });
        return void 0;
    }
    public writeBuffer(buffer: string): void {
        return this._write(Buffer.from(buffer));
    }
    private _log(color?: string | ((str: string) => string), msg?: any): ILogger {
        if (!this._isDebug && !this._userInteractive) return this._write(msg), this;
        if (!this._userInteractive) {
            console.log(msg);
        } else {
            this._write(msg);
            if (color) {
                if (typeof (color) === "function") {
                    msg = color(msg);
                } else {
                    msg = `${color}${msg}`;
                }
            }
            console.log(`${ConsoleColor.FgMagenta}cwserver ${msg}${ConsoleColor.Reset}`);
        }
        return this;
    }
    public write(msg: any, color?: IColor): ILogger {
        return this._log(color, msg);
    }
    public log(msg: any, color?: IColor): ILogger {
        if (!this._isDebug) return this;
        return this._log(color, msg);
    }
    public info(msg: any): ILogger {
        if (!this._isDebug) return this;
        return this._log(ConsoleColor.Yellow, msg);
    }
    public success(msg: any): ILogger {
        if (!this._isDebug) return this;
        return this._log(ConsoleColor.FgGreen, msg);
    }
    public error(msg: any): ILogger {
        if (!this._isDebug) return this;
        return this._log(ConsoleColor.FgRed, msg);
    }
    public reset(): ILogger {
        if (!this._isDebug) return this;
        return console.log(ConsoleColor.Reset), this;
    }
    public dispose() {
        if (this._fd > 0) {
            this.flush();
            _fs.closeSync(this._fd);
            this._fd = -1;
            this._canWrite = false;
        }
        this._buff.dispose();
    }
}