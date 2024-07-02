/* eslint-disable @typescript-eslint/ban-types */
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
exports.parseUrl = exports.downloadToFile = exports.makeRequest = void 0;
const fs = __importStar(require("fs"));
const https_1 = __importDefault(require("https"));
const axios_1 = __importDefault(require("axios"));
// import Logger from '../logger';
// import * as miscUtils from './misc';
// const logger = Logger.getLogger();
/**
 * Make generic HTTP request
 *
 * @param host    host where request should be made
 * @param uri     request uri
 * @param options function options
 *
 * @returns response data
 */
function makeRequest(host, uri, options) {
    return __awaiter(this, void 0, void 0, function* () {
        options = options || {};
        // logger.debug(`Making HTTP request: ${host} ${uri} ${miscUtils.stringify(options)}`);
        const httpResponse = yield axios_1.default({
            httpsAgent: new https_1.default.Agent({
                rejectUnauthorized: false
            }),
            method: options['method'] || 'GET',
            baseURL: `https://${host}:${options['port'] || 443}`,
            url: uri,
            headers: options['headers'] !== undefined ? options['headers'] : {},
            data: options['body'] || null,
            auth: options['basicAuth'] !== undefined ? {
                username: options['basicAuth']['user'],
                password: options['basicAuth']['password']
            } : null,
            validateStatus: null
        });
        // check for advanced return
        if (options.advancedReturn) {
            return {
                statusCode: httpResponse.status,
                body: httpResponse.data
            };
        }
        // check for unsuccessful request
        if (httpResponse.status > 300) {
            return Promise.reject(new Error(`HTTP request failed: ${httpResponse.status} ${JSON.stringify(httpResponse.data)}`));
        }
        // return response body
        return httpResponse.data;
    });
}
exports.makeRequest = makeRequest;
/**
 * Download HTTP payload to file
 *
 * @param url  url
 * @param file local file location where the downloaded contents should go
 *
 * @returns void
 */
function downloadToFile(url, file) {
    return __awaiter(this, void 0, void 0, function* () {
        yield new Promise(((resolve) => {
            axios_1.default({
                httpsAgent: new https_1.default.Agent({
                    rejectUnauthorized: false
                }),
                method: 'GET',
                url,
                responseType: 'stream'
            })
                .then(function (response) {
                response.data.pipe(fs.createWriteStream(file))
                    .on('finish', resolve);
            });
        }));
    });
}
exports.downloadToFile = downloadToFile;
/**
 * Parse URL
 *
 * @param url  url
 *
 * @returns parsed url properties
 */
function parseUrl(url) {
    return {
        host: url.split('://')[1].split('/')[0],
        path: `/${url.split('://')[1].split('/').slice(1).join('/')}`
    };
}
exports.parseUrl = parseUrl;
//# sourceMappingURL=extHttp.js.map