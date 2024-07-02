/**
 * Copyright 2021 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NimClient = void 0;
// import http, { IncomingMessage, RequestOptions } from 'http';
const https_1 = __importDefault(require("https"));
const source_1 = __importDefault(require("@szmarczak/http-timer/dist/source"));
const axios_1 = __importDefault(require("axios"));
const f5_conx_core_1 = require("f5-conx-core");
const utils_1 = require("./utils");
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
 * @param user
 * @param password
 * @param options.port (default = 443)
 *
 */
class NimClient {
    /**
     * @param options function options
     */
    constructor(host, eventEmitter) {
        this.api = {
            license: '/api/v0/about/license',
            system: '/api/v0/about/system',
            analyze: '/api/v0/system/analyze',
            instances: '/api/v0/instances',
            scan: '/api/v0/scan',
            scanServers: '/api/v0/scan/servers'
        };
        this.host = host;
        this.port = host.port || 443;
        this.events = eventEmitter;
        this.axios = this.createAxiosInstance();
    }
    /**
     * creates the axios instance that will be used for all f5 calls
     *
     * includes auth/token management
     */
    createAxiosInstance() {
        const baseInstanceParams = {
            baseURL: `https://${this.host.device}`,
            transport
        };
        // create axsios instance
        const axInstance = axios_1.default.create(baseInstanceParams);
        // re-assign parent this objects needed within the parent instance objects...
        const events = this.events;
        const device = this.host.device;
        // ---- https://github.com/axios/axios#interceptors
        // Add a request interceptor
        axInstance.interceptors.request.use(function (config) {
            // adjust tcp timeout, default=0, which relys on host system
            config.timeout = Number(process.env.F5_CONX_CORE_TCP_TIMEOUT);
            config.uuid = (config === null || config === void 0 ? void 0 : config.uuid) ? config.uuid : f5_conx_core_1.getRandomUUID(4, { simple: true });
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
            events.emit('log-http-response', resp);
            return resp;
        }, function (err) {
            // Any status codes that falls outside the range of 2xx cause this function to trigger
            var _a, _b;
            // if we got a failed password response
            if (((_a = err.response) === null || _a === void 0 ? void 0 : _a.status) === 401 &&
                ((_b = err.response) === null || _b === void 0 ? void 0 : _b.statusText) === 'Unauthorized') {
                // fire failed password event so upper logic can clear details
                events.emit('failedAuth', {
                    device,
                    err: err.response.data
                });
            }
            // Do something with response error
            return Promise.reject(err);
        });
        return axInstance;
    }
    /**
     * Make HTTP request
     *
     * @param uri     request URI
     * @param options axios options
     *
     * @returns request response
     */
    async makeRequest(url, options = {}) {
        // // merge incoming options into requestDefaults object
        // options = Object.assign(requestDefaults, options);
        var _a, _b;
        // options.url = `http://${this.host}:${this.port}${url}`;
        options.url = url;
        if (((_b = (_a = this.host) === null || _a === void 0 ? void 0 : _a.auth) === null || _b === void 0 ? void 0 : _b.basic) && this.password) {
            options.auth = {
                username: this.host.auth.basic,
                password: this.password
            };
        }
        // options.httpsAgent = new https.Agent({ keepAlive: true });
        return await this.axios(options);
    }
    /**
     * try to connect and gather nim system information
     */
    async connect() {
        this.password = await utils_1.getPassword(this.host.device);
        await this.makeRequest(this.api.license)
            .then(resp => {
            this.license = resp.data;
        });
        await this.makeRequest(this.api.system)
            .then(resp => {
            this.system = resp.data;
        });
        utils_1.savePassword(this.host.device, this.password);
    }
}
exports.NimClient = NimClient;
//# sourceMappingURL=nimClient.js.map