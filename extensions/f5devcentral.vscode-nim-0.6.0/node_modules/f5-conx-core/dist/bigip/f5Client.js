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
exports.F5Client = void 0;
const events_1 = require("events");
// import { MetadataClient } from "./metadata";
const mgmtClient_1 = require("./mgmtClient");
const ucsClient_1 = require("./ucsClient");
const qkviewClient_1 = require("./qkviewClient");
const fastClient_1 = require("./fastClient");
const as3Client_1 = require("./as3Client");
const doClient_1 = require("./doClient");
const tsClient_1 = require("./tsClient");
const cfClient_1 = require("./cfClient");
const atcMgmtClient_1 = require("./atcMgmtClient");
const externalHttps_1 = require("../externalHttps");
const constants_1 = require("../constants");
const path_1 = __importDefault(require("path"));
/**
 *  Main F5 connectivity client
 *
 * Basic Example:
 *
 * ```
 * const mgmtClient = new f5Client(
 *      host: '192.0.2.1',
 *      user: 'admin',
 *      password: 'admin',
 *      {
 *          port: 8443,
 *          provider: 'tmos'
 *      }
 * );
 * await f5Client.discover();
 * const resp = await f5Client.makeRequest('/mgmt/tm/sys/version');
 * ```
*/
class F5Client {
    constructor(host, user, password, hostOptions, eventEmmiter, extHttp) {
        /**
         * ATC meta data including:
         *  * service endpoint information /info/declare/tasks
         *  * github releases url
         *  * github main repo url
         */
        this.atcMetaData = constants_1.atcMetaData;
        this.mgmtClient = new mgmtClient_1.MgmtClient(host, user, password, hostOptions, eventEmmiter);
        this.cacheDir = process.env.F5_CONX_CORE_CACHE || path_1.default.join(process.cwd(), constants_1.TMP_DIR);
        this.events = eventEmmiter ? eventEmmiter : new events_1.EventEmitter();
        // setup external http class (feed it the events instance)
        this.extHttp = extHttp ? extHttp : new externalHttps_1.ExtHttp({
            eventEmitter: this.events,
        });
        // setup ucsClient
        this.ucs = new ucsClient_1.UcsClient(this.mgmtClient);
        // setup qkviewClient
        this.qkview = new qkviewClient_1.QkviewClient(this.mgmtClient);
        // setup atc rpm ilx mgmt
        this.atc = new atcMgmtClient_1.AtcMgmtClient(this.mgmtClient, this.extHttp);
    }
    /**
     * clear auth token
     *  - mainly for unit tests...
     */
    clearLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.clearToken();
        });
    }
    /**
     * Make HTTP request
     *
     * @param uri     request URI
     * @param options function options
     *
     * @returns request response
     */
    https(uri, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(uri, options);
        });
    }
    /**
     * discover information about device
     *  - bigip/bigiq/nginx?
     *  - tmos/nginx version
     *  - installed atc services and versions
     *
     */
    discover() {
        return __awaiter(this, void 0, void 0, function* () {
            // // refresh atc meta data
            // this.refreshMetaData()
            // .then( resp => {
            //     this.events.emit('log-info', 'Refreshing atc metadata from cloud')
            //     this.atcMetaData = resp.data;
            // })
            // .catch( err => {
            //     this.events.emit('log-info', {
            //         msg: 'was NOT able to access internet to get latest atc metadata',
            //         err
            //     })
            // })
            // get device info
            yield this.mgmtClient.makeRequest('/mgmt/shared/identified-devices/config/device-info')
                .then(resp => {
                // assign details to this and mgmtClient class
                this.host = resp.data;
                this.mgmtClient.hostInfo = resp.data;
            });
            // check FAST installed by getting verion info
            yield this.mgmtClient.makeRequest(this.atcMetaData.fast.endPoints.info)
                .then(resp => {
                this.fast = new fastClient_1.FastClient(resp.data, this.atcMetaData.fast, this.mgmtClient);
            })
                .catch(() => {
                // do nothing... but catch the error from bubbling up and causing other issues
                // this.logger.debug(err);
            });
            // check AS3 installed by getting verion info
            yield this.mgmtClient.makeRequest(this.atcMetaData.as3.endPoints.info)
                .then(resp => {
                // if http 2xx, create as3 client
                // notice the recast of resp.data type of "unknown" to "AtcInfo"
                this.as3 = new as3Client_1.As3Client(resp.data, this.atcMetaData.as3, this.mgmtClient);
            })
                .catch(() => {
                // do nothing... but catch the error from bubbling up and causing other issues
                // this.logger.debug(err);
            });
            // check DO installed by getting verion info
            yield this.mgmtClient.makeRequest(this.atcMetaData.do.endPoints.info)
                .then(resp => {
                this.do = new doClient_1.DoClient(resp.data[0], this.atcMetaData.do, this.mgmtClient);
            })
                .catch(() => {
                // do nothing... but catch the error from bubbling up and causing other issues
                // this.logger.debug(err);
            });
            // check TS installed by getting verion info
            yield this.mgmtClient.makeRequest(this.atcMetaData.ts.endPoints.info)
                .then(resp => {
                this.ts = new tsClient_1.TsClient(resp.data, this.atcMetaData.ts, this.mgmtClient);
            })
                .catch(() => {
                // do nothing... but catch the error from bubbling up and causing other issues
                // this.logger.debug(err);
            });
            // check CF installed by getting verion info
            yield this.mgmtClient.makeRequest(this.atcMetaData.cf.endPoints.info)
                .then(resp => {
                this.cf = new cfClient_1.CfClient(resp.data, this.atcMetaData.cf, this.mgmtClient);
            })
                .catch(() => {
                // do nothing... but catch the error from bubbling up and causing other issues
                // this.logger.debug(err);
            });
            return;
            // return object of discovered services
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
     * @param localSourcePathFilename
     * @param uploadType
     */
    upload(localSourcePathFilename, uploadType) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mgmtClient.upload(localSourcePathFilename, uploadType);
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
    download(fileName, localDestPath, downloadType) {
        return __awaiter(this, void 0, void 0, function* () {
            // todo: update response typeing to include http details
            return this.mgmtClient.download(fileName, localDestPath, downloadType);
        });
    }
}
exports.F5Client = F5Client;
//# sourceMappingURL=f5Client.js.map