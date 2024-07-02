/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
'use strict';
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
exports.ExtHttp = void 0;
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const source_1 = __importDefault(require("@szmarczak/http-timer/dist/source"));
const misc_1 = require("./utils/misc");
const constants_1 = require("./constants");
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
 * Class for making all external HTTP calls
 * @constructor options.rejectUnauthorized - set to false to allow self-signed certs (default true)
 */
class ExtHttp {
    constructor(options) {
        this.events = (options === null || options === void 0 ? void 0 : options.eventEmitter) ? options.eventEmitter : new events_1.EventEmitter;
        options === null || options === void 0 ? true : delete options.eventEmitter; // delete eventEmitter from object before was pass to axios
        // set cache directory
        this.cacheDir = process.env.F5_CONX_CORE_CACHE || path_1.default.join(process.cwd(), constants_1.TMP_DIR);
        // set the user-agent, required for github connections
        this.userAgent = process.env.F5_CONX_CORE_EXT_HTTP_AGENT || 'F5 Conx Core';
        this.axios = this.createAxiosInstance(options);
        // todo: setup proxy details, probably capture from env's
    }
    /**
     * core external axios instance
     * @param reqBase
     */
    createAxiosInstance(reqBase = {}) {
        // #####################################
        // Request timings are disabled for external resolution.  There was a corner case where they are breaking the download function with github and redirects.  
        // add request timinings
        // reqBase.transport = transport;
        // #####################################
        // add option to allow self-signed cert
        if ((reqBase === null || reqBase === void 0 ? void 0 : reqBase.rejectUnauthorized) === false) {
            // add agent option
            reqBase.httpsAgent = new https_1.default.Agent({ rejectUnauthorized: false });
        }
        // remove param
        reqBase === null || reqBase === void 0 ? true : delete reqBase.rejectUnauthorized;
        // // open up the allowed responses to include redirects.
        // reqBase.validateStatus = function (status) {
        //     return status >= 200 && status <= 302;
        // }
        // set user agent
        reqBase.headers = {
            'User-Agent': this.userAgent
        };
        // create axsios instance with collected params
        const axInstance = axios_1.default.create(reqBase);
        // re-assign parent this objects needed within the parent instance objects...
        const events = this.events;
        // ---- https://github.com/axios/axios#interceptors
        // Add a request interceptor
        axInstance.interceptors.request.use(function (config) {
            // adjust tcp timeout, default=0, which relys on host system
            config.timeout = Number(process.env.F5_CONX_CORE_TCP_TIMEOUT);
            config.uuid = (config === null || config === void 0 ? void 0 : config.uuid) ? config.uuid : misc_1.getRandomUUID(4, { simple: true });
            // events.emit('log-info', `EXTERNAL-HTTPS-REQU [${config.uuid}]: ${config.method} -> ${config.url}`)
            events.emit('log-http-request', config);
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
            // events.emit('log-info', `EXTERNAL-HTTPS-RESP [${resp.config.uuid}]: ${resp.status} - ${resp.statusText}`);
            events.emit('log-http-response', resp);
            return resp;
        }, function (err) {
            // Any status codes that falls outside the range of 2xx cause this function to trigger
            // Do something with response error
            return Promise.reject(err);
        });
        return axInstance;
    }
    /**
     * Make External HTTP request
     *
     * @param url absolute url
     * @param options axios options
     *
     * @returns request response
     */
    makeRequest(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseURL = new URL(options.url);
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
                        baseURL: baseURL.origin,
                        url: baseURL.pathname,
                        method: resp.request.method,
                        headers: resp.config.headers,
                        protocol: baseURL.protocol,
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
                    this.events.emit('log-info', `EXTERNAL-HTTPS-RESP [${err.response.config.uuid}]: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
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
                            headers: err.response.config.headers,
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
                        message: 'EXTERNAL-HTTPS-REQUEST-FAILED',
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
                        message: 'EXTERNAL-HTTPS request failed',
                        // uuid: err.response.config.uuid,
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
     * download file from external (not f5)
     * @param url fully qualified URL
     * @param fileName (optional) destination file name - if you want it different than url
     * @param destPath (optional) where to put the file (default is local project cache folder)
     * @param options axios requestion options
     */
    download(url, fileName, destPath, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // extract path from URL
            const urlPath = new URL(url).pathname;
            // extract file name from url path
            fileName = fileName ? fileName : path_1.default.basename(urlPath);
            // set the response type for file download
            options['responseType'] = 'stream';
            // move url into options object
            options.url = url;
            destPath = destPath ? destPath : this.cacheDir;
            this.events.emit('log-debug', {
                message: 'pending external download',
                destPath,
                options
            });
            const writable = fs_1.default.createWriteStream(`${destPath}/${fileName}`);
            return new Promise(((resolve, reject) => {
                this.makeRequest(options)
                    .then(resp => {
                    resp.data.pipe(writable)
                        .on('finish', () => {
                        // over-write response data
                        resp.data = {
                            file: writable.path,
                            bytes: writable.bytesWritten
                        };
                        this.events.emit('log-debug', {
                            message: 'download complete',
                            data: resp.data
                        });
                        return resolve(resp);
                    });
                })
                    .catch(err => {
                    // look at adding more failure details, like,
                    // was it tcp, dns, dest url problem, write file problem, ...
                    return reject(err);
                });
            }));
        });
    }
    /**
     *
     * @param url
     * @param localSourcePathFilename
     */
    upload(url, localSourcePathFilename) {
        return __awaiter(this, void 0, void 0, function* () {
            // array to hold responses
            const responses = [];
            const fileName = path_1.default.parse(localSourcePathFilename).base;
            const fileStats = fs_1.default.statSync(localSourcePathFilename);
            const chunkSize = 1024 * 1024;
            let start = 0;
            let end = Math.min(chunkSize, fileStats.size - 1);
            this.events.emit('log-debug', {
                message: 'pending upload',
                localSourcePathFilename,
                url
            });
            while (end <= fileStats.size - 1 && start < end) {
                const resp = yield this.makeRequest({
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Range': `${start}-${end}/${fileStats.size}`,
                        'Content-Length': end - start + 1
                    },
                    data: fs_1.default.createReadStream(localSourcePathFilename, { start, end }),
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
}
exports.ExtHttp = ExtHttp;
//# sourceMappingURL=externalHttps.js.map