/// <reference types="node" />
import { Stats } from 'fs';
import { IContext } from './server';
export declare class Streamer {
    static stream(ctx: IContext, absPath: string, mimeType: string, fstat: Stats): void;
}
