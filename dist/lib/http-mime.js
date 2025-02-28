"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpMimeHandler = void 0;
// 9:22 PM 5/4/2020
// by rajib chy
const _fs = __importStar(require("fs"));
const _path = __importStar(require("path"));
const _zlib = __importStar(require("zlib"));
const stream_1 = require("stream");
const destroy = require("destroy");
const _mimeType = __importStar(require("./http-mime-types"));
const http_cache_1 = require("./http-cache");
const web_streamer_1 = require("./web-streamer");
const encryption_1 = require("./encryption");
const app_util_1 = require("./app-util");
const file_info_1 = require("./file-info");
const _mamCache = {};
// "exe", "zip", "doc", "docx", "pdf", "ppt", "pptx", "gz"
const TaskDeff = [
    { cache: false, ext: "exe", gzip: false },
    { cache: false, ext: "zip", gzip: false },
    { cache: false, ext: "doc", gzip: true },
    { cache: false, ext: "docx", gzip: true },
    { cache: false, ext: "pdf", gzip: true },
    { cache: false, ext: "ppt", gzip: true },
    { cache: false, ext: "pptx", gzip: true },
    { cache: false, ext: "gz", gzip: false },
    { cache: false, ext: "mp3", gzip: false },
    { cache: false, ext: "html", gzip: false },
    { cache: false, ext: "htm", gzip: false },
    { cache: false, ext: "wjsx", gzip: false }
];
function createGzip() {
    return _zlib.createGzip({ level: _zlib.constants.Z_BEST_COMPRESSION });
}
class MimeHandler {
    static getCachePath(ctx) {
        const path = _path.join(ctx.server.config.staticFile.tempPath, encryption_1.Encryption.toMd5(ctx.path));
        // const path: string = `${ctx.server.config.staticFile.tempPath}\\${Encryption.toMd5(ctx.path)}`;
        return _path.resolve(`${path}.${ctx.extension}.cache`);
    }
    static _sendFromMemCache(ctx, mimeType, dataInfo) {
        const reqCacheHeader = http_cache_1.HttpCache.getChangedHeader(ctx.req.headers);
        const etag = http_cache_1.HttpCache.getEtag(dataInfo.lastChangeTime, dataInfo.cfileSize);
        ctx.res.setHeader('x-served-from', 'mem-cache');
        if (reqCacheHeader.etag || reqCacheHeader.sinceModify) {
            let exit = false;
            if (reqCacheHeader.etag) {
                if (reqCacheHeader.etag === etag) {
                    http_cache_1.HttpCache.writeCacheHeader(ctx.res, {}, ctx.server.config.cacheHeader);
                    ctx.res.status(304, { 'Content-Type': mimeType }).send();
                    return ctx.next(304);
                }
                exit = true;
            }
            if (reqCacheHeader.sinceModify && !exit) {
                http_cache_1.HttpCache.writeCacheHeader(ctx.res, {}, ctx.server.config.cacheHeader);
                ctx.res.status(304, { 'Content-Type': mimeType }).send();
                return ctx.next(304);
            }
        }
        http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
            lastChangeTime: dataInfo.lastChangeTime,
            etag: http_cache_1.HttpCache.getEtag(dataInfo.lastChangeTime, dataInfo.cfileSize)
        }, ctx.server.config.cacheHeader);
        ctx.res.status(200, {
            'Content-Type': mimeType,
            'Content-Encoding': 'gzip'
        });
        return ctx.res.end(dataInfo.gizipData), ctx.next(200);
    }
    static _holdCache(cachePath, lastChangeTime, size) {
        if (_mamCache[cachePath])
            return;
        setImmediate(() => {
            _mamCache[cachePath] = {
                lastChangeTime,
                cfileSize: size,
                gizipData: _fs.readFileSync(cachePath)
            };
        });
    }
    static servedFromServerFileCache(ctx, absPath, mimeType, fstat, cachePath) {
        const useFullOptimization = ctx.server.config.useFullOptimization;
        const reqCacheHeader = http_cache_1.HttpCache.getChangedHeader(ctx.req.headers);
        return this._fileInfo.stat(cachePath, (desc) => {
            const existsCachFile = desc.exists;
            return ctx.handleError(null, () => {
                let lastChangeTime = 0, cfileSize = 0;
                if (existsCachFile && desc.stats) {
                    cfileSize = desc.stats.size;
                    lastChangeTime = desc.stats.mtime.getTime();
                }
                let hasChanged = true;
                if (existsCachFile) {
                    hasChanged = fstat.mtime.getTime() > lastChangeTime;
                }
                const etag = cfileSize !== 0 ? http_cache_1.HttpCache.getEtag(lastChangeTime, cfileSize) : void 0;
                if (!hasChanged && existsCachFile && (reqCacheHeader.etag || reqCacheHeader.sinceModify)) {
                    let exit = false;
                    if (etag && reqCacheHeader.etag) {
                        if (reqCacheHeader.etag === etag) {
                            http_cache_1.HttpCache.writeCacheHeader(ctx.res, {}, ctx.server.config.cacheHeader);
                            ctx.res.status(304, { 'Content-Type': mimeType }).send();
                            if (useFullOptimization && cachePath) {
                                this._holdCache(cachePath, lastChangeTime, cfileSize);
                            }
                            return ctx.next(304);
                        }
                        exit = true;
                    }
                    if (reqCacheHeader.sinceModify && !exit) {
                        http_cache_1.HttpCache.writeCacheHeader(ctx.res, {}, ctx.server.config.cacheHeader);
                        ctx.res.status(304, { 'Content-Type': mimeType }).send();
                        if (useFullOptimization && cachePath) {
                            this._holdCache(cachePath, lastChangeTime, cfileSize);
                        }
                        return ctx.next(304);
                    }
                }
                if (!hasChanged && existsCachFile) {
                    http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
                        lastChangeTime,
                        etag: http_cache_1.HttpCache.getEtag(lastChangeTime, cfileSize)
                    }, ctx.server.config.cacheHeader);
                    ctx.res.status(200, {
                        'Content-Type': mimeType,
                        'Content-Encoding': 'gzip',
                        'x-served-from': 'cache-file'
                    });
                    if (useFullOptimization && cachePath) {
                        this._holdCache(cachePath, lastChangeTime, cfileSize);
                    }
                    return app_util_1.Util.pipeOutputStream(cachePath, ctx);
                }
                const rstream = _fs.createReadStream(absPath);
                const wstream = _fs.createWriteStream(cachePath);
                return (0, stream_1.pipeline)(rstream, createGzip(), wstream, (gzipErr) => {
                    destroy(rstream);
                    destroy(wstream);
                    return ctx.handleError(gzipErr, () => {
                        return this._fileInfo.stat(cachePath, (cdesc) => {
                            return ctx.handleError(null, () => {
                                if (!cdesc.stats) {
                                    ctx.next(404, true);
                                    return;
                                }
                                lastChangeTime = cdesc.stats.mtime.getTime();
                                http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
                                    lastChangeTime,
                                    etag: http_cache_1.HttpCache.getEtag(lastChangeTime, cdesc.stats.size)
                                }, ctx.server.config.cacheHeader);
                                ctx.res.status(200, { 'Content-Type': mimeType, 'Content-Encoding': 'gzip' });
                                if (useFullOptimization && cachePath) {
                                    this._holdCache(cachePath, lastChangeTime, cdesc.stats.size);
                                }
                                return app_util_1.Util.pipeOutputStream(cachePath, ctx);
                            });
                        }, true);
                    });
                });
            });
        });
    }
    static servedNoChache(ctx, absPath, mimeType, isGzip, size) {
        http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
            lastChangeTime: void 0,
            etag: void 0
        }, { maxAge: 0, serverRevalidate: true });
        if (ctx.server.config.staticFile.compression && isGzip) {
            ctx.res.status(200, {
                'Content-Type': mimeType,
                'Content-Encoding': 'gzip'
            });
            const rstream = _fs.createReadStream(absPath);
            return (0, stream_1.pipeline)(rstream, createGzip(), ctx.res, (gzipErr) => {
                destroy(rstream);
            }), void 0;
        }
        ctx.res.status(200, {
            'Content-Type': mimeType, 'Content-Length': size
        });
        return app_util_1.Util.pipeOutputStream(absPath, ctx);
    }
    static servedFromFile(ctx, absPath, mimeType, isGzip, fstat) {
        const reqCachHeader = http_cache_1.HttpCache.getChangedHeader(ctx.req.headers);
        const lastChangeTime = fstat.mtime.getTime();
        const curEtag = http_cache_1.HttpCache.getEtag(lastChangeTime, fstat.size);
        if ((reqCachHeader.etag && reqCachHeader.etag === curEtag) ||
            (reqCachHeader.sinceModify && reqCachHeader.sinceModify === lastChangeTime)) {
            http_cache_1.HttpCache.writeCacheHeader(ctx.res, {}, ctx.server.config.cacheHeader);
            ctx.res.status(304, { 'Content-Type': mimeType }).send();
            return ctx.next(304);
        }
        http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
            lastChangeTime,
            etag: curEtag
        }, ctx.server.config.cacheHeader);
        if (ctx.server.config.staticFile.compression && isGzip) {
            ctx.res.status(200, { 'Content-Type': mimeType, 'Content-Encoding': 'gzip' });
            const rstream = _fs.createReadStream(absPath);
            return (0, stream_1.pipeline)(rstream, createGzip(), ctx.res, (gzipErr) => {
                destroy(rstream);
            }), void 0;
        }
        ctx.res.status(200, { 'Content-Type': mimeType });
        return app_util_1.Util.pipeOutputStream(absPath, ctx);
    }
    static _render(ctx, mimeType, absPath, stat, cachePath) {
        ctx.req.setSocketNoDelay(true);
        if (ctx.path.indexOf('favicon.ico') > -1) {
            http_cache_1.HttpCache.writeCacheHeader(ctx.res, {
                lastChangeTime: void 0, etag: void 0
            }, {
                maxAge: ctx.server.config.cacheHeader.maxAge,
                serverRevalidate: false
            });
            ctx.res.status(200, { 'Content-Type': mimeType });
            return app_util_1.Util.pipeOutputStream(absPath, ctx);
        }
        if (ctx.server.config.liveStream.indexOf(ctx.extension) > -1) {
            return web_streamer_1.Streamer.stream(ctx, absPath, mimeType, stat);
        }
        let noCache = false;
        const taskDeff = TaskDeff.find(a => a.ext === ctx.extension);
        let isGzip = (!ctx.server.config.staticFile.compression ? false : http_cache_1.HttpCache.isAcceptedEncoding(ctx.req.headers, "gzip"));
        if (isGzip) {
            if (ctx.server.config.staticFile.minCompressionSize > 0 && stat.size < ctx.server.config.staticFile.minCompressionSize) {
                isGzip = false;
            }
        }
        if (taskDeff) {
            noCache = taskDeff.cache === false;
            if (isGzip) {
                isGzip = taskDeff.gzip;
            }
        }
        if (noCache === true || ctx.server.config.noCache.indexOf(ctx.extension) > -1) {
            return this.servedNoChache(ctx, absPath, mimeType, isGzip, stat.size);
        }
        if (!isGzip || (ctx.server.config.staticFile.fileCache === false)) {
            return this.servedFromFile(ctx, absPath, mimeType, isGzip, stat);
        }
        return this.servedFromServerFileCache(ctx, absPath, mimeType, stat, cachePath);
    }
    static render(ctx, mimeType, maybeDir) {
        const cachePath = ctx.server.config.staticFile.fileCache ? this.getCachePath(ctx) : undefined;
        const useFullOptimization = ctx.server.config.useFullOptimization;
        if (cachePath) {
            if (useFullOptimization && _mamCache[cachePath]) {
                return this._sendFromMemCache(ctx, mimeType, _mamCache[cachePath]);
            }
        }
        const absPath = typeof (maybeDir) === "string" && maybeDir ? _path.resolve(`${maybeDir}/${ctx.path}`) : ctx.server.mapPath(ctx.path);
        return this._fileInfo.stat(absPath, (desc) => {
            return ctx.handleError(null, () => {
                if (!desc.stats)
                    return ctx.next(404, true);
                return this._render(ctx, mimeType, absPath, desc.stats, cachePath || "");
            });
        });
    }
}
MimeHandler._fileInfo = new file_info_1.FileInfoCacheHandler();
class HttpMimeHandler {
    getMimeType(extension) {
        return _mimeType.getMimeType(extension);
    }
    isValidExtension(extension) {
        return _mimeType.isValidExtension(extension);
    }
    render(ctx, maybeDir) {
        if (!_mimeType.isValidExtension(ctx.extension)) {
            return ctx.transferRequest(404);
        }
        return MimeHandler.render(ctx, _mimeType.getMimeType(ctx.extension), maybeDir);
    }
}
exports.HttpMimeHandler = HttpMimeHandler;
// 11:38 PM 5/4/2020
//# sourceMappingURL=http-mime.js.map