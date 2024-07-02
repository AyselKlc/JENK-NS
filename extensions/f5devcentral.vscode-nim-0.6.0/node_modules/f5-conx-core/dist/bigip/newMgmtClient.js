/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewMgmtClient = void 0;
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const fs = __importStar(require("fs"));
const events_1 = require("events");
const constants_1 = require("../constants");
// import { HttpResponse, uuidAxiosRequestConfig, AxiosResponseWithTimings } from "../utils/httpModels";
/**
 * F5 connectivity mgmt client
 *
 * @param host
 * @param port
 * @param user
 * @param options.password
 * @param options.provider
 *
 */
class NewMgmtClient {
    /**
     * @param options function options
     */
    constructor(host, user, password, options) {
        this.host = host;
        this._user = user;
        this._password = password;
        this.port = (options === null || options === void 0 ? void 0 : options.port) || 443;
        this._provider = (options === null || options === void 0 ? void 0 : options.provider) || 'tmos';
        this.events = new events_1.EventEmitter;
        // this.axios = this.createAxiosInstance();
    }
    /**
     *
     * @return event emitter instance
     */
    getEvenEmitter() {
        return this.events;
    }
    /**
     * clear auth token and timer
     *  - used for logging out/disconnecting, and testing
     */
    clearToken() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events.emit('log-info', `clearing token/timer with ${this._tokenTimeout} left`);
            const tokenTimeOut = this._tokenTimeout;
            this._token = undefined;
            clearInterval(this._tokenIntervalId);
            return tokenTimeOut;
        });
    }
    /**
     * sets/gets/refreshes auth token
     */
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            //
            const payload = {
                username: this._user,
                password: this._password,
                loginProviderName: this._provider
            };
            return new Promise((resolve, reject) => {
                const request = https_1.default.request({
                    path: '/mgmt/shared/authn/login',
                    host: this.host,
                    port: this.port,
                    rejectUnauthorized: false,
                    headers: {
                        'content-type': 'application/json'
                    },
                    method: 'POST',
                }, resp => {
                    const buffer = [];
                    resp.on("data", chunk => {
                        buffer.push(chunk);
                    });
                    resp.on("end", () => {
                        let data = buffer.join('');
                        data = data || '{}';
                        try {
                            data = JSON.parse(data);
                        }
                        catch (e) {
                            console.log(e);
                            debugger;
                        }
                        // capture entire token
                        this._token = data.token;
                        // set token timeout for timer
                        this._tokenTimeout = data.token.timeout;
                        this.events.emit('log-debug', `auth token aquired, timeout: ${this._tokenTimeout}`);
                        // this.tokenTimer();  // start token timer
                        if (resp.statusCode) {
                            return resolve({
                                status: resp.statusCode,
                                headers: resp.headers,
                                data
                            });
                        }
                        else {
                            console.error(`HTTP FAILURE: ${resp.statusCode} - ${resp.statusMessage}`);
                            return reject(new Error(`HTTP - ${resp.statusCode} - ${resp.statusMessage}`));
                        }
                    });
                });
                request.on('error', e => {
                    // might need to stringify combOpts for proper log output
                    debugger;
                });
                // if a payload was passed in, post it!
                if (payload) {
                    request.write(JSON.stringify(payload));
                }
                request.end();
            });
        });
    }
    makeRequest(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            // if auth token has expired, it should have been cleared, get new one
            if (!this._token) {
                yield this.getToken();
            }
            return new Promise((resolve, reject) => {
                var _a;
                const request = https_1.default.request({
                    host: this.host,
                    port: this.port,
                    rejectUnauthorized: false,
                    headers: {
                        'x-f5-auth-token': (_a = this._token) === null || _a === void 0 ? void 0 : _a.token
                    },
                    path: uri,
                    method: 'GET',
                }, resp => {
                    const buffer = [];
                    resp.on("data", data => {
                        buffer.push(data);
                    });
                    resp.on("end", () => {
                        let data = buffer.join('');
                        try {
                            data = JSON.parse(data);
                        }
                        catch (e) {
                            console.log(e);
                            debugger;
                        }
                        if (resp.statusCode) {
                            return resolve({
                                status: resp.statusCode,
                                headers: resp.headers,
                                data
                            });
                        }
                        else {
                            console.error(`HTTP FAILURE: ${resp.statusCode} - ${resp.statusMessage}`);
                            return reject(new Error(`HTTP - ${resp.statusCode} - ${resp.statusMessage}`));
                        }
                    });
                });
                request.on('error', e => {
                    // might need to stringify combOpts for proper log output
                    debugger;
                });
                request.end();
            });
        });
    }
    download(fileName, localDestPath, downloadType) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // if auth token has expired, it should have been cleared, get new one
            if (!this._token) {
                yield this.getToken();
            }
            // swap out download url as needed (ternary method)
            const url = downloadType === 'UCS' ? `${constants_1.F5DownloadPaths.ucs.uri}/${fileName}`
                : downloadType === 'QKVIEW' ? `${constants_1.F5DownloadPaths.qkview.uri}/${fileName}`
                    : `${constants_1.F5DownloadPaths.iso.uri}/${fileName}`;
            //  if we got a dest path with no filename, append the filename
            const fileP = path_1.default.parse(localDestPath).ext
                ? localDestPath
                : `${localDestPath}/${fileName}`;
            const options = {
                host: this.host,
                port: this.port,
                rejectUnauthorized: false,
                headers: {
                    'x-f5-auth-token': (_a = this._token) === null || _a === void 0 ? void 0 : _a.token
                },
                path: url,
                method: 'GET',
            };
            this.events.emit('log-debug', {
                message: 'pending download',
                fileName,
                localDestPath,
                downloadType
            });
            const resps = [];
            // const resp = await axios.request(options)
            return new Promise(((resolve, reject) => {
                const writable = fs.createWriteStream(fileP);
                const request = https_1.default.request(options, resp => {
                    resps.push(resp);
                    resp.pipe(writable);
                    // .on('finish', resolve)
                    writable
                        .on('finish', () => {
                        // over-write response data
                        // resp.data = {
                        //     file: writable.path,
                        //     bytes: writable.bytesWritten
                        // };
                        this.events.emit('log-debug', {
                            message: 'download complete',
                        });
                        return resolve('resp');
                    })
                        .on('error', err => {
                        debugger;
                        return reject(err);
                    });
                });
                request.on('error', e => {
                    // might need to stringify combOpts for proper log output
                    debugger;
                });
                request.end();
            }));
        });
    }
}
exports.NewMgmtClient = NewMgmtClient;
//# sourceMappingURL=newMgmtClient.js.map