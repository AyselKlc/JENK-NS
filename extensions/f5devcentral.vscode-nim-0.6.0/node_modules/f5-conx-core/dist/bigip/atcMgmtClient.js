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
exports.AtcMgmtClient = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const constants_1 = require("../constants");
/**
 * class for managing Automated Tool Chain services
 *  - install/unInstall
 *  - including download from web and upload to f5)
 *  - will cache files locally to minimize downloads)
 *  - installed services and available versions should be handled at the f5Client level (through discover function and metadata client)
 *
 * @param mgmtClient connected device mgmt client
 * @param extHttp client for external connectivity
 *
 */
class AtcMgmtClient {
    constructor(mgmtClient, extHttp) {
        this.isBigiq = false;
        this.mgmtClient = mgmtClient;
        this.extHttp = extHttp;
    }
    morphBigiq() {
        // if bigiq, update functions to support the different work flow
        if (this.mgmtClient.hostInfo.product === 'BIG-IQ') {
            // not bigiq, so don't apply any updates
            // return;
            this.isBigiq = true;
            // after upload move rpm here
            // ls -l /usr/lib/dco/packages/f5-appsvcs/
            // remount for update
            // mount -o remount,rw /usr
            // copy package into directory
            // cp /shared/tmp/f5-appsvcs-3.24.0-5.noarch.rpm /usr/lib/dco/packages/f5-appsvcs/
            // mount back to ro
            // mount -o remount,ro /usr
            // update package cmd
            // rpm -Uv /usr/lib/dco/packages/f5-appsvcs/f5-appsvcs-3.24.0-5.noarch.rpm
            // restart services
            // tmsh restart /sys service restjavad restnoded
        }
    }
    /**
     * download file from external web location
     * - should be rpm files and rsa signatures
     *
     * @param url ex.
     * `https://github.com/F5Networks/f5-appsvcs-templates/releases/download/v1.4.0/f5-appsvcs-templates-1.4.0-1.noarch.rpm`
     */
    download(url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mgmtClient.events.emit('log-info', {
                msg: 'downloading rpm from web',
                url
            });
            // extract path from URL
            const urlPath = new URL(url).pathname;
            const fileName = path_1.default.basename(urlPath);
            const localFilePath = path_1.default.join(this.extHttp.cacheDir, fileName);
            const existing = fs_1.default.existsSync(localFilePath);
            if (existing) {
                // file was found in cache
                const fileStat = fs_1.default.statSync(localFilePath);
                const resp = { data: {
                        file: localFilePath,
                        cache: true,
                        bytes: fileStat.size
                    } };
                this.mgmtClient.events.emit('log-info', {
                    msg: 'found local cached rpm',
                    file: resp.data
                });
                return resp;
            }
            else {
                // file not found in cache, download
                return yield this.extHttp.download(url);
            }
        });
    }
    /**
     * upload rpm to f5
     * FILE
     *  - uri: '/mgmt/shared/file-transfer/uploads'
     *  - path: '/var/config/rest/downloads'
     * @param rpm `full local path + file name`
     */
    uploadRpm(rpm) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mgmtClient.events.emit('log-info', `uploading atc rpm: ${rpm}`);
            return yield this.mgmtClient.upload(rpm, 'FILE');
        });
    }
    /**
     * install rpm on F5 (must be uploaded first)
     * @param rpmName
     */
    install(rpmName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.mgmtClient.events.emit('log-info', `installing atc rpm: ${rpmName}`);
            return yield this.mgmtClient.makeRequest(constants_1.iControlEndpoints.atcPackageMgmt, {
                method: 'POST',
                data: {
                    operation: 'INSTALL',
                    packageFilePath: `${constants_1.F5UploadPaths.file.path}/${rpmName}`
                }
            })
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                // this will follow the rpm install process till it completes, but we need to follow this with another async to wait till the service endpoints become available, which typically requires a service restart of restjavad/restnoded
                const waitTillReady = yield this.mgmtClient.followAsync(`${constants_1.iControlEndpoints.atcPackageMgmt}/${resp.data.id}`);
                // await this.watchAtcRestart();
                this.mgmtClient.events.emit('log-info', `installing atc rpm job complete, waiting for services to restart (~30 seconds)`);
                yield new Promise(resolve => { setTimeout(resolve, 30000); });
                // figure out what atc service we installed, via rpmName?
                // then poll that atc service endpoint (info) till it returns a version
                // pust that information into the async array for end user visibility
                // waitTillReady.async.push()
                return waitTillReady;
            }));
        });
    }
    /**
     * shows installed atc ilx rpms on f5
     */
    showInstalled() {
        return __awaiter(this, void 0, void 0, function* () {
            this.mgmtClient.events.emit('log-info', `gathering installed atc rpms`);
            return yield this.mgmtClient.makeRequest(constants_1.iControlEndpoints.atcPackageMgmt, {
                method: 'POST',
                data: {
                    operation: 'QUERY'
                }
            })
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                return yield this.mgmtClient.followAsync(`${constants_1.iControlEndpoints.atcPackageMgmt}/${resp.data.id}`);
            }));
        });
    }
    /**
     * uninstall atc/ilx/rpm package on f5
     * @param packageName
     * ex. 'f5-appsvcs-templates-1.4.0-1.noarch'
     */
    unInstall(packageName) {
        return __awaiter(this, void 0, void 0, function* () {
            // todo: build async follower to start after job completion and watch for services to be available again
            // https://clouddocs.f5.com/products/iapp/iapp-lx/tmos-13_1/icontrollx_rest_api_appendix/package_management_tasks.html
            // https://support.f5.com/csp/article/K51226856
            this.mgmtClient.events.emit('log-info', `un-installing atc rpm: ${packageName}`);
            return yield this.mgmtClient.makeRequest(constants_1.iControlEndpoints.atcPackageMgmt, {
                method: 'POST',
                data: {
                    operation: 'UNINSTALL',
                    packageName
                }
            })
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                // for uninstall operations, this is just gonna have to work
                const awaitServiceRestart = yield this.mgmtClient.followAsync(`${constants_1.iControlEndpoints.atcPackageMgmt}/${resp.data.id}`);
                // await this.watchAtcRestart();
                this.mgmtClient.events.emit('log-info', `un-installing atc rpm job complete, waiting for services to restart (~30 seconds)`);
                yield new Promise(resolve => { setTimeout(resolve, 30000); });
                // check if atc services restarted and append thier responses when complete
                // awaitServiceRestart.async.push(await this.mgmtClient.followAsync('/mgmt/tm/sys/service/restnoded/stats'))
                // awaitServiceRestart.async.push(await this.mgmtClient.followAsync('/mgmt/tm/sys/service/restjavad/stats'))
                return awaitServiceRestart;
            }));
        });
    }
    /**
     * after the rpm install/unInstall job completes (which happens in seconds), the restnoded/restjavad services need to restart, which can take 20-30 seconds before the service is available for use
     *
     * Having this function would allow that restart to be monitored so the UI can be refreshed and the service can start being used
     *
     * to be called at the end of most of the functions above
     */
    watchAtcRestart() {
        return __awaiter(this, void 0, void 0, function* () {
            const restnoded = yield this.mgmtClient.followAsync('/mgmt/tm/sys/service/restnoded/stats');
            const restjavad = yield this.mgmtClient.followAsync('/mgmt/tm/sys/service/restjavad/stats');
            // capture restart information and inject into calling function http response for visibility
            return { restnoded, restjavad };
        });
    }
}
exports.AtcMgmtClient = AtcMgmtClient;
//# sourceMappingURL=atcMgmtClient.js.map