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
exports.MetadataClient = void 0;
// import assert from 'assert';
const extHttp = __importStar(require("../utils/extHttp"));
const atc_metadata_old_json_1 = __importDefault(require("./atc_metadata.old.json"));
const EXTENSION_METADATA = {
    url: 'https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json'
};
/**
 * this is the original f5-sdk-js atc meta data client
 */
class MetadataClient {
    /**
     *
     * @param component        component name
     * @param componentVersion component version
     *
     * @returns void
     */
    constructor(component, options) {
        this._metadata = this._loadLocalMetadata();
        this._component = component;
        this._componentVersion = options['componentVersion'] || this.getLatestVersion();
    }
    /**
     * Get component name
     *
     * @returns component name
     */
    getComponentName() {
        return this._component;
    }
    /**
     * Get component package name
     *
     * @returns component version
     */
    getComponentPackageName() {
        const packageName = this._getComponentVersionMetadata()['packageName'];
        return packageName.match(/.+?(?=-[0-9])/)[0];
    }
    /**
     * Get component version
     *
     * @returns component version
     */
    getComponentVersion() {
        return this._componentVersion;
    }
    /**
     * Get component version
     *
     * @returns component version
     */
    getComponentVersionsList() {
        return Object.keys(this._getComponentMetadata()['versions']);
    }
    /**
     * Get configuration endpoint
     *
     * @returns configuration endpoint properties
     */
    getConfigurationEndpoint() {
        const configure = this._getComponentMetadata()['endpoints']['configure'];
        return {
            endpoint: configure.uri,
            methods: configure.methods
        };
    }
    /**
     * Get download package
     *
     * @returns package download name
     */
    getDownloadPackageName() {
        const downloadUrlSplit = this.getDownloadUrl().split('/');
        return downloadUrlSplit[downloadUrlSplit.length - 1];
    }
    /**
     * Get download URL
     *
     * @returns full download URL
     */
    getDownloadUrl() {
        return this._getComponentVersionMetadata()['downloadUrl'];
    }
    /**
     * Get info endpoint
     *
     * @returns info endpoint properties
     */
    getInfoEndpoint() {
        const info = this._getComponentMetadata()['endpoints']['info'];
        return {
            endpoint: info.uri,
            methods: info.methods
        };
    }
    /**
     * Get inspect endpoint
     *
     * @returns info endpoint properties
     */
    getInspectEndpoint() {
        const info = this._getComponentMetadata()['endpoints']['inspect'];
        return {
            endpoint: info.uri,
            methods: info.methods
        };
    }
    /**
     * Get 'latest' metadata
     *
     * @returns void
     */
    getLatestMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedUrl = extHttp.parseUrl(EXTENSION_METADATA.url);
            try {
                const response = yield extHttp.makeRequest(parsedUrl.host, parsedUrl.path);
                // this._metadata = response.data;
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    /**
     * Get latest component version
     *
     * @returns get latest component version
     */
    getLatestVersion() {
        const componentVersions = this._getComponentMetadata()['versions'];
        const latestVersions = [];
        Object.keys(componentVersions).forEach((version) => {
            if (componentVersions[version].latest) {
                latestVersions.push(version);
            }
        });
        return latestVersions[0]; // there should only be one;
    }
    /**
     * Get trigger endpoint
     *
     * @returns info endpoint properties
     */
    getResetEndpoint() {
        const info = this._getComponentMetadata()['endpoints']['reset'];
        return {
            endpoint: info.uri,
            methods: info.methods
        };
    }
    /**
     * Get trigger endpoint
     *
     * @returns info endpoint properties
     */
    getTriggerEndpoint() {
        const info = this._getComponentMetadata()['endpoints']['trigger'];
        return {
            endpoint: info.uri,
            methods: info.methods
        };
    }
    _loadLocalMetadata() {
        return atc_metadata_old_json_1.default;
    }
    _getComponentMetadata() {
        return this._metadata['components'][this._component];
    }
    _getComponentVersionMetadata() {
        return this._getComponentMetadata()['versions'][this._componentVersion];
    }
}
exports.MetadataClient = MetadataClient;
//# sourceMappingURL=metadata.old.js.map