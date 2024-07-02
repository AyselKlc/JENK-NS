/* eslint-disable @typescript-eslint/no-unused-vars */
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
exports.cmp = exports.AtcVersionsClient = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const externalHttps_1 = require("../externalHttps");
const constants_1 = require("../constants");
const events_1 = require("events");
const _atcVersionsBaseCache = __importStar(require("./atcVersions.json"));
/**
 * class for managing Automated Tool Chain services versions
 *
 * Uses atc meta data to query each service public repo and get release information
 *
 * @param extHttp client for external connectivity
 * @param logger logger class for logging events within this class
 *
 */
class AtcVersionsClient {
    constructor(options) {
        /**
         * ATC meta data including api endpoints, github releases url and main repo url
         */
        this.atcMetaData = constants_1.atcMetaData;
        /**
         * base atc version information that comes with the package
         *
         * *updated with every release of f5-conx-core*
         */
        this.atcVersionsBaseCache = _atcVersionsBaseCache;
        /**
         * atc version cache name/location
         *
         * '/home/someUser/f5-conx-core/src/bigip/atcVersions.json'
         */
        this.atcVersionsFileName = 'atcVersions.json';
        /**
         * object containing all the LATEST versions/releases/assets information for each ATC service.
         */
        this.atcVersions = {};
        this.extHttp = options.extHttp ? options.extHttp : new externalHttps_1.ExtHttp();
        this.cachePath = options.cachePath ? path_1.default.join(options.cachePath, this.atcVersionsFileName) : this.atcVersionsFileName;
        this.events = options.eventEmitter ? options.eventEmitter : new events_1.EventEmitter;
    }
    /**
     * returns atc version information
     *
     * will only query github to refresh once a day and saves details to file
     */
    getAtcReleasesInfo() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // load info from cache
            yield this.loadReleaseInfoFromCache();
            // if we have cache data, get date
            const checkDate = new Date((_a = this.atcVersions) === null || _a === void 0 ? void 0 : _a.lastCheckDate).getDate();
            // get todays date
            const todayDate = new Date().getDate();
            // is it today?
            if (checkDate === todayDate) {
                // was already checked/refreshed today, so pass cached info
                this.events.emit('log-info', `atc release version already checked today, returning cache from ${this.cachePath}`);
                return this.atcVersions;
            }
            else {
                // has not been checked today, refresh
                this.events.emit('log-info', 'atc release version has NOT been checked today, refreshing cache now');
                yield this.refreshAtcReleasesInfo();
                return this.atcVersions;
            }
        });
    }
    loadReleaseInfoFromCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // load atc versions cache
                const versionFile = fs_1.default.readFileSync(this.cachePath).toString();
                this.atcVersions = JSON.parse(versionFile);
            }
            catch (e) {
                this.events.emit('log-error', `no atc release version metadata found at ${this.atcVersionsFileName}`);
            }
            return;
        });
    }
    /**
     * save atc release/versions information to cache
     */
    saveReleaseInfoToCache() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.events.emit('log-info', `saving atc versions cache to ${this.cachePath}`);
                fs_1.default.writeFileSync(this.cachePath, JSON.stringify(this.atcVersions, undefined, 4));
            }
            catch (e) {
                this.events.emit('log-error', `not able to save atc versions info to ${this.atcVersionsFileName}`);
            }
            return;
        });
    }
    /*
     * loads all the release information for each ATC service
     * - this should be async to complete in the background once a day
     */
    refreshAtcReleasesInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            // holds the promises from the axios request calls since the forEach loop is not async aware
            // a request will be sent for each loop iteration, but all responses will be recieved in parallel
            const promiseArray = [];
            Object.keys(this.atcMetaData).forEach((atc) => __awaiter(this, void 0, void 0, function* () {
                // at launch of extension, load all the latest atc metadata
                const y = this.atcMetaData[atc].gitReleases;
                promiseArray.push(this.extHttp.makeRequest({ url: this.atcMetaData[atc].gitReleases })
                    .then(resp => {
                    // loop through reach release and build 
                    const latest = [];
                    const releases = resp.data.map((el) => {
                        // get filter/map out only the details we want for each asset
                        const assets = el.assets.map((asset) => {
                            return {
                                name: asset.name,
                                id: asset.id,
                                size: asset.size,
                                browser_download_url: asset.browser_download_url
                            };
                        });
                        // remove the leadin "v" from the version number
                        // const version = el.tag_name.replace(/v/, '');
                        const version = el.tag_name;
                        latest.push(version);
                        return {
                            version,
                            id: el.id,
                            assets
                        };
                    });
                    this.atcVersions[atc] = {
                        releases,
                        latest: latest.sort(cmp)[latest.length - 1]
                    };
                }).catch(err => {
                    this.events.emit('log-error', {
                        msg: `refreshAtcReleasesInfo, was not able to fetch release info for ${atc}`,
                        url: this.atcMetaData[atc].gitReleases,
                        resp: err
                    });
                }));
            }));
            // now that all the calls have been made and processin in parallel, wait for all the promises to resolve and update the necessary information
            yield Promise.all(promiseArray);
            // if we made i this far and still no atc version information from github
            if (this.atcVersions === {}) {
                // apply base cache that comes with the project
                // this should get updated at every package release
                this.atcVersions = this.atcVersionsBaseCache;
            }
            // inject todays date
            this.atcVersions.lastCheckDate = new Date();
            this.saveReleaseInfoToCache();
            return;
        });
    }
}
exports.AtcVersionsClient = AtcVersionsClient;
/**
 * compares semver
 *
 * https://github.com/substack/semver-compare
 *
 * @param a
 * @param b
 */
function cmp(a, b) {
    // refactor this into ternary operators
    // remove leading "v" if found, then split on "."
    const pa = a.replace(/v/, '').split('.');
    const pb = b.replace(/v/, '').split('.');
    for (let i = 0; i < 3; i++) {
        const na = Number(pa[i]);
        const nb = Number(pb[i]);
        if (na > nb) {
            return 1;
        }
        if (nb > na) {
            return -1;
        }
        if (!isNaN(na) && isNaN(nb)) {
            return 1;
        }
        if (isNaN(na) && !isNaN(nb)) {
            return -1;
        }
    }
    return 0;
}
exports.cmp = cmp;
//# sourceMappingURL=atcVersionsClient.js.map