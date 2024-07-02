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
exports.MgmtClient = void 0;
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const fs = __importStar(require("fs"));
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const source_1 = __importDefault(require("@szmarczak/http-timer/dist/source"));
const constants_1 = require("../constants");
const misc_1 = require("../utils/misc");
/**
 * Used to inject http call timers
 * transport:request: httpsWithTimer
 * @szmarczak/http-timer
 */
const transport = {
    request: function httpsWithTimer(...args) {
        const request = https_1.default.request.apply(null, args);
        source_1.default(request);
        return request;
    }
};
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
class MgmtClient {
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
        this.axios = this.createAxiosInstance();
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
    createAxiosInstance() {
        const baseInstanceParams = {
            baseURL: `https://${this.host}:${this.port}`,
            httpsAgent: new https_1.default.Agent({
                rejectUnauthorized: false,
            }),
            headers: {
                'content-type': 'application/json'
            },
        };
        // create axsios instance
        const axInstance = axios_1.default.create(baseInstanceParams);
        // re-assign parent this objects needed within the parent instance objects...
        const events = this.events;
        const clearToken = function () {
            this.clearToken();
        };
        // ---- https://github.com/axios/axios#interceptors
        // Add a request interceptor
        axInstance.interceptors.request.use(function (config) {
            // adjust tcp timeout, default=0, which relys on host system
            config.timeout = Number(process.env.F5_CONX_CORE_TCP_TIMEOUT);
            // config.uuid = getRandomUUID(4, { simple: true })
            config.uuid = (config === null || config === void 0 ? void 0 : config.uuid) ? config.uuid : misc_1.getRandomUUID(4, { simple: true });
            events.emit('log-info', `HTTPS-REQU [${config.uuid}]: ${config.method} -> ${config.baseURL}${config.url}`);
            return config;
        }, function (err) {
            // Do something with request error
            // not sure how to test this, but it is probably handled up the chain
            return Promise.reject(err);
        });
        //  response interceptor
        axInstance.interceptors.response.use(function (resp) {
            // Any status code that lie within the range of 2xx cause this function to trigger
            // Do something with response data
            events.emit('log-info', `HTTPS-RESP [${resp.config.uuid}]: ${resp.status} - ${resp.statusText}`);
            return resp;
        }, function (err) {
            // Any status codes that falls outside the range of 2xx cause this function to trigger
            var _a, _b;
            // if we got a failed password response
            if (((_a = err.response) === null || _a === void 0 ? void 0 : _a.status) === 401 &&
                ((_b = err.response) === null || _b === void 0 ? void 0 : _b.data.message) === 'Authentication failed.') {
                // fire failed password event so upper logic can clear details
                // this.events.emit('failedAuth');
                events.emit('failedAuth', err.response.data);
                clearToken(); // clear the token anyway
            }
            // Do something with response error
            return Promise.reject(err);
        });
        return axInstance;
    }
    /**
     * sets/gets/refreshes auth token
     */
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events.emit('log-debug', `getting auth token from: ${this.host}:${this.port}`);
            return yield this.axios({
                url: '/mgmt/shared/authn/login',
                method: 'POST',
                data: {
                    username: this._user,
                    password: this._password,
                    loginProviderName: this._provider
                }
            })
                .then(resp => {
                // capture entire token
                this._token = resp.data['token'];
                // set token timeout for timer
                this._tokenTimeout = resp.data.token.timeout;
                this.events.emit('log-debug', `auth token aquired, timeout: ${this._tokenTimeout}`);
                this.tokenTimer(); // start token timer
                return;
            })
                .catch(err => {
                this.events.emit('log-error', `token request failed: ${err.message}`);
                // todo: add non http error details to log
                // reThrow the error back up the chain
                return Promise.reject(err);
            });
        });
    }
    /**
     * Make HTTP request
     *
     * @param uri     request URI
     * @param options axios options
     *
     * @returns request response
     */
    makeRequest(uri, options) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // if auth token has expired, it should have been cleared, get new one
            if (!this._token) {
                yield this.getToken();
            }
            const requestDefaults = {
                url: uri,
                method: (options === null || options === void 0 ? void 0 : options.method) || undefined,
                headers: Object.assign((options === null || options === void 0 ? void 0 : options.headers) || {}, {
                    'x-f5-auth-token': (_a = this._token) === null || _a === void 0 ? void 0 : _a.token
                }),
                data: (options === null || options === void 0 ? void 0 : options.data) || undefined
            };
            // merge incoming options into requestDefaults object
            options = Object.assign(requestDefaults, options);
            return yield this.axios.request(options)
                .then((resp) => {
                // only return the things we need
                return {
                    data: resp.data,
                    headers: resp.headers,
                    status: resp.status,
                    statusText: resp.statusText,
                    request: {
                        uuid: resp.config.uuid,
                        baseURL: resp.config.baseURL,
                        url: resp.config.url,
                        method: resp.request.method,
                        headers: resp.config.headers,
                        protocol: resp.config.httpsAgent.protocol,
                        timings: resp.request.timings
                    }
                };
            })
                .catch(err => {
                // todo: rework this to build a singe err-response object to be passed back as an event
                // https://github.com/axios/axios#handling-errors
                if (err.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    // this.events.emit('log-debug', `HTTPS-RESP [${err.response.config.uuid}]: ${err.response.status} - ${JSON.stringify(err.response.data)}`)
                    // only return the things we need...  we'll see...
                    return Promise.reject({
                        data: err.response.data,
                        headers: err.response.headers,
                        status: err.response.status,
                        statusText: err.response.statusText,
                        request: {
                            uuid: err.response.config.uuid,
                            baseURL: err.response.config.baseURL,
                            url: err.response.config.url,
                            method: err.request.method,
                            headers: err.request.headers,
                            protocol: err.response.config.httpsAgent.protocol,
                            timings: err.request.timings
                        }
                    });
                }
                else if (err.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    this.events.emit('log-error', {
                        message: 'HTTPS-REQUEST-FAILED',
                        path: err.request.path,
                        err: err.message
                    });
                    // return Promise.reject(err.request)
                }
                else {
                    // got a lower level (config) failure
                    // not sure how to test this...
                    /* istanbul ignore next */
                    this.events.emit('log-error', {
                        message: 'HTTPS request failed',
                        uuid: err.response.config.uuid,
                        err
                    });
                }
                return Promise.reject(err);
                // thought:  just log the individual situations and have a single reject clause like below
                // return Promise.reject({
                //     message: 'HTTPS request failed',
                //     uuid,
                //     err
                // })
            });
        });
    }
    /**
     * bigip auth token lifetime countdown
     * will clear auth token details when finished
     * prompting the next http call to get a new token
     */
    tokenTimer() {
        return __awaiter(this, void 0, void 0, function* () {
            this.events.emit('log-debug', `Starting token timer: ${this._tokenTimeout}`);
            this._tokenIntervalId = setInterval(() => {
                this._tokenTimeout--;
                // todo: add event to emit timer countdown
                if (this._tokenTimeout <= 0) {
                    clearInterval(this._tokenIntervalId);
                    this._token = undefined; // clearing token details should get a new token
                    this.events.emit('log-debug', 'authToken expired:', this._tokenTimeout);
                }
                // run timer a little fast to pre-empt update
            }, 999);
        });
    }
    followAsync(url) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._token) {
                yield this.getToken();
            }
            //  build async wait array -> progressively waits longer
            //  https://stackoverflow.com/questions/12503146/create-an-array-with-same-element-repeated-multiple-times
            // first 4 rounds, wait 5 seconds each (20 seconds total)
            const retryTimerArray = Array.from({ length: 4 }, () => 5);
            // next 6 rounds, wait 10 seconds each (1 minute total)
            retryTimerArray.push(...Array.from({ length: 6 }, () => 10));
            // next 30 rounds, wait 30 seconds each (15 minutes total)
            retryTimerArray.push(...Array.from({ length: 30 }, () => 30));
            const responses = [];
            while (retryTimerArray.length > 0) {
                // set makeRequest to never throw an error, but keep going till a valid response
                const resp = yield this.makeRequest(url);
                // get the last response
                responses.push(resp);
                // be thinking about expanding this to accomodate all flows like DO/ILX/... install
                //  where there could be catastrophic responses (network timeouts/tcp rejects/http errors)
                // if the job kicked off right (since we got here), then keep trying till we get some reponse
                // if ILX install follow services restart...
                // if DO follow device restart...
                if (((_a = resp.data) === null || _a === void 0 ? void 0 : _a.status) === 'FAILED') {
                    // got an http/200, but the job failed, so reject promise and push the error back up the stack
                    return Promise.reject(resp);
                }
                // todo: break out the successful and failed results, only refresh statusBars on successful
                if (((_b = resp.data) === null || _b === void 0 ? void 0 : _b.status) === 'FINISHED') {
                    retryTimerArray.length = 0;
                }
                // QKVIEW async job responses
                //  "IN_PROGRESS"
                if (((_c = resp.data) === null || _c === void 0 ? void 0 : _c.status) === 'SUCCEEDED') {
                    retryTimerArray.length = 0;
                }
                // as3 results array
                if (((_d = resp.data) === null || _d === void 0 ? void 0 : _d.results) && resp.data.results[0].message !== 'in progress') {
                    retryTimerArray.length = 0;
                }
                // if atc rpm mgmt -> watch for restnoded service restart
                if ((_f = (_e = resp.data) === null || _e === void 0 ? void 0 : _e.apiRawValues) === null || _f === void 0 ? void 0 : _f.apiAnonymous) {
                    console.log((_g = resp.data) === null || _g === void 0 ? void 0 : _g.apiRawValues.apiAnonymous);
                    if (resp.data.apiRawValues.apiAnonymous.includes('run')) {
                        console.log('ending service watch');
                        retryTimerArray.length = 0;
                    }
                }
                yield new Promise(resolve => {
                    // take the first array item off and use it as a delay timer
                    setTimeout(resolve, retryTimerArray.shift() * 1000);
                });
            }
            // get last response to return
            const response = responses.pop();
            // inject array of remaining async req/resp
            response.async = responses;
            return response;
        });
    }
    // ##########################################################################
    // ##########################################################################
    // ##########################################################################
    // ##########################################################################
    /**
     *
     * https://support.f5.com/csp/article/K41763344
     *
     *
     */
    // ##########################################################################
    // ##########################################################################
    // ##########################################################################
    // ##########################################################################
    /**
     * download file from f5 (ucs/qkview/iso)
     * - UCS
     *   - uri: /mgmt/shared/file-transfer/ucs-downloads/${fileName}
     *   - path: /var/local/ucs/${fileName}
     * - QKVIEW
     *   - uri: /mgmt/cm/autodeploy/qkview-downloads/${fileName}
     *   - path: /var/tmp/${fileName}
     * - ISO
     *   - uri: /mgmt/cm/autodeploy/software-image-downloads/${fileName}
     *   - path: /shared/images/${fileName}
     *
     * @param fileName file name on bigip
     * @param localDestPathFile where to put the file (including file name)
     * @param downloadType: type F5DownLoad = "UCS" | "QKVIEW" | "ISO"
     */
    download(fileName, localDestPath, downloadType) {
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
            // const options: uuidAxiosRequestConfig = {
            //     baseURL: `https://${this.host}:${this.port}`,
            //     url,
            //     httpsAgent: new https.Agent({
            //         rejectUnauthorized: false,
            //     }),
            //     headers: {
            //         'x-f5-auth-token': this._token.token
            //     },
            //     responseType: 'stream'
            // }
            this.events.emit('log-debug', {
                message: 'pending download',
                fileName,
                localDestPath,
                downloadType
            });
            const writable = fs.createWriteStream(fileP);
            // const resp = await axios.request(options)
            // resp.data.pipe(writable)
            const resp2 = [];
            return new Promise(((resolve, reject) => {
                this.makeRequest(url, { responseType: 'stream' })
                    .then((resp) => __awaiter(this, void 0, void 0, function* () {
                    resp2.push(resp);
                    resp.data.pipe(writable);
                    // 
                    let contentRange = resp.headers['content-range'];
                    let contentLength = parseInt(resp.headers['content-length']);
                    const contentEnd = parseInt(contentRange.split('/').pop());
                    contentRange = resp.headers['content-range'];
                    let currentChunkEnd = contentRange.split('/')[0].split('-')[1];
                    let nextChunkStart = (parseInt(currentChunkEnd) + 1);
                    let nextChunkEnd = (parseInt(currentChunkEnd) + (contentLength));
                    if (resp.status === 206) {
                        let loopCount = 5;
                        while (loopCount > 0) {
                            // next chunk end is bigger than full content lenght, so this is the last chunk
                            if (nextChunkEnd >= contentEnd) {
                                // allow our loop to run one more time and set the final data chunk end
                                loopCount = 0;
                                // make last chunk end match total size
                                nextChunkEnd = contentEnd;
                                // make the content length match the size of the last chuck being called for
                                contentLength = contentEnd - nextChunkStart;
                                debugger;
                            }
                            yield this.makeRequest(url, {
                                responseType: 'stream',
                                headers: {
                                    "content-type": 'application/octet-stream',
                                    "content-range": `${nextChunkStart}-${nextChunkEnd}/${contentEnd}`,
                                    "content-length": `${contentLength}`
                                }
                            })
                                .then(respIn => {
                                resp2.push(respIn);
                                // resp.data.pipe(respIn);
                                contentRange = respIn.headers['content-range'];
                                currentChunkEnd = contentRange.split('/')[0].split('-')[1];
                                nextChunkStart = (parseInt(currentChunkEnd) + 1);
                                nextChunkEnd = (parseInt(currentChunkEnd) + (contentLength - 1));
                                debugger;
                            })
                                .catch(err => {
                                debugger;
                            });
                            loopCount = loopCount - 1;
                        }
                        debugger;
                    }
                    if (resp.status === 200) {
                        debugger;
                    }
                }))
                    .catch(err => {
                    // look at adding more failure details, like,
                    // was it tcp, dns, dest url problem, write file problem, ...
                    return reject(err);
                });
                writable
                    .on('finish', () => {
                    // over-write response data
                    // resp.data = {
                    //     file: writable.path,
                    //     bytes: writable.bytesWritten
                    // };
                    // this.events.emit('log-debug', {
                    //     message: 'download complete',
                    //     data: resp.data
                    // })
                    return resolve(resp2);
                })
                    .on('error', err => {
                    debugger;
                    return reject(err);
                });
            }));
        });
    }
    /**
     * download file from f5 (ucs/qkview/iso)
     * - UCS
     *   - uri: /mgmt/shared/file-transfer/ucs-downloads/${fileName}
     *   - path: /var/local/ucs/${fileName}
     * - QKVIEW
     *   - uri: /mgmt/cm/autodeploy/qkview-downloads/${fileName}
     *   - path: /var/tmp/${fileName}
     * - ISO
     *   - uri: /mgmt/cm/autodeploy/software-image-downloads/${fileName}
     *   - path: /shared/images/${fileName}
     *
     * @param fileName file name on bigip
     * @param localDestPathFile where to put the file (including file name)
     * @param downloadType: type F5DownLoad = "UCS" | "QKVIEW" | "ISO"
     */
    downloadNew(fileName, localDestPath, downloadType) {
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
            // const options: uuidAxiosRequestConfig = {
            //     baseURL: `https://${this.host}:${this.port}`,
            //     url,
            //     httpsAgent: new https.Agent({
            //         rejectUnauthorized: false,
            //     }),
            //     headers: {
            //         'x-f5-auth-token': this._token.token
            //     },
            //     responseType: 'stream'
            // }
            this.events.emit('log-debug', {
                message: 'pending download',
                fileName,
                localDestPath,
                downloadType
            });
            const writable = fs.createWriteStream(fileP);
            // const resp = await axios.request(options)
            // resp.data.pipe(writable)
            const resp2 = [];
            return new Promise(((resolve, reject) => {
                this.makeRequest(url, { responseType: 'stream' })
                    .then((resp) => __awaiter(this, void 0, void 0, function* () {
                    resp2.push(resp);
                    resp.data.pipe(writable);
                    // 
                    let contentRange = resp.headers['content-range'];
                    let contentLength = parseInt(resp.headers['content-length']);
                    const contentEnd = parseInt(contentRange.split('/').pop());
                    contentRange = resp.headers['content-range'];
                    let currentChunkEnd = contentRange.split('/')[0].split('-')[1];
                    let nextChunkStart = (parseInt(currentChunkEnd) + 1);
                    let nextChunkEnd = (parseInt(currentChunkEnd) + (contentLength));
                    if (resp.status === 206) {
                        let loopCount = 5;
                        while (loopCount > 0) {
                            // next chunk end is bigger than full content lenght, so this is the last chunk
                            if (nextChunkEnd >= contentEnd) {
                                // allow our loop to run one more time and set the final data chunk end
                                loopCount = 0;
                                // make last chunk end match total size
                                nextChunkEnd = contentEnd;
                                // make the content length match the size of the last chuck being called for
                                contentLength = contentEnd - nextChunkStart;
                                debugger;
                            }
                            yield this.makeRequest(url, {
                                responseType: 'stream',
                                headers: {
                                    "content-type": 'application/octet-stream',
                                    "content-range": `${nextChunkStart}-${nextChunkEnd}/${contentEnd}`,
                                    "content-length": `${contentLength}`
                                }
                            })
                                .then(respIn => {
                                resp2.push(respIn);
                                // resp.data.pipe(respIn);
                                contentRange = respIn.headers['content-range'];
                                currentChunkEnd = contentRange.split('/')[0].split('-')[1];
                                nextChunkStart = (parseInt(currentChunkEnd) + 1);
                                nextChunkEnd = (parseInt(currentChunkEnd) + (contentLength - 1));
                                debugger;
                            })
                                .catch(err => {
                                debugger;
                            });
                            loopCount = loopCount - 1;
                        }
                        debugger;
                    }
                    if (resp.status === 200) {
                        debugger;
                    }
                }))
                    .catch(err => {
                    // look at adding more failure details, like,
                    // was it tcp, dns, dest url problem, write file problem, ...
                    return reject(err);
                });
                writable
                    .on('finish', () => {
                    // over-write response data
                    // resp.data = {
                    //     file: writable.path,
                    //     bytes: writable.bytesWritten
                    // };
                    // this.events.emit('log-debug', {
                    //     message: 'download complete',
                    //     data: resp.data
                    // })
                    return resolve(resp2);
                })
                    .on('error', err => {
                    debugger;
                    return reject(err);
                });
            }));
        });
    }
    /**
     * upload file to f5 -> used for ucs/ilx-rpms/.conf-merges
     *
     * types of F5 uploads
     * - FILE
     *  - uri: '/mgmt/shared/file-transfer/uploads'
     *  - path: '/var/config/rest/downloads'
     * - ISO
     *  - uri: '/mgmt/cm/autodeploy/software-image-uploads'
     *  - path: '/shared/images'
     *
     * https://devcentral.f5.com/s/articles/demystifying-icontrol-rest-part-5-transferring-files
     * https://support.f5.com/csp/article/K41763344
     * @param localSourcePathFilename
     * @param uploadType
     */
    upload(localSourcePathFilename, uploadType) {
        return __awaiter(this, void 0, void 0, function* () {
            // if auth token has expired, it should have been cleared, get new one
            if (!this._token) {
                yield this.getToken();
            }
            // array to hold responses
            const responses = [];
            const fileName = path_1.default.parse(localSourcePathFilename).base;
            const fileStats = fs.statSync(localSourcePathFilename);
            const chunkSize = 512 * 1024;
            let start = 0;
            let end = Math.min(chunkSize, fileStats.size - 1);
            const url = uploadType === 'FILE'
                ? `${constants_1.F5UploadPaths.file.uri}/${fileName}`
                : `${constants_1.F5UploadPaths.iso.uri}/${fileName}`;
            this.events.emit('log-debug', {
                message: 'pending upload',
                localSourcePathFilename,
                uploadType
            });
            while (end <= fileStats.size - 1 && start < end) {
                const resp = yield this.makeRequest(url, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/octet-stream',
                        'content-range': `${start}-${end}/${fileStats.size}`,
                        'content-length': end - start + 1
                    },
                    data: fs.createReadStream(localSourcePathFilename, { start, end }),
                });
                start += chunkSize;
                if (end + chunkSize < fileStats.size - 1) { // more to go
                    end += chunkSize;
                }
                else if (end + chunkSize > fileStats.size - 1) { // last chunk
                    end = fileStats.size - 1;
                }
                else { // done - could use do..while loop instead of this
                    end = fileStats.size;
                }
                responses.push(resp);
            }
            // get the last response
            const lastResponse = responses.pop();
            // inject file stream information
            lastResponse.data.fileName = fileName;
            lastResponse.data.bytes = fileStats.size;
            this.events.emit('log-debug', {
                message: 'upload complete',
                data: lastResponse.data
            });
            return lastResponse;
        });
    }
    /**
     * this funciton is used to build a filename for with all necessary host specific details
     *   for files like ucs/qkviews
     * @returns string with `${this.hostname}_${this.host}_${cleanISOdateTime}`
     * @example bigip1_10.200.244.101_20201127T220451142Z
     */
    getFileName() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.hostInfo) {
                // start with ISO Date and remove ":", ".", and "-"
                const cleanISOdateTime = new Date().toISOString().replace(/(:|\.|-)/g, '');
                // if mgmtIP is IPv6 format - make it filename friendly
                if (/\[[\w:]+\]/.test(this.hostInfo.managementAddress)) {
                    const removedBrackets = this.hostInfo.managementAddress.replace(/\[|\]/g, '');
                    const flat = removedBrackets.replace(/:/g, '.');
                    return `${this.hostInfo.hostname}_${flat}_${cleanISOdateTime}`;
                }
                else {
                    return `${this.hostInfo.hostname}_${this.hostInfo.managementAddress}_${cleanISOdateTime}`;
                }
            }
            else {
                this.events.emit('log-error', 'getFileName function called, but no hostInfo, discover device first');
                return Promise.reject('getFileName function called, but no hostInfo, discover device first');
            }
        });
    }
}
exports.MgmtClient = MgmtClient;
//# sourceMappingURL=mgmtClient_extra1.js.map