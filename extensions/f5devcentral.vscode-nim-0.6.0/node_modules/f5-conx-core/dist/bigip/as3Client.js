/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.As3Client = void 0;
const misc_1 = require("../utils/misc");
const constants_1 = require("../constants");
/**
 * AS3 client class that handles AS3 calls
 */
class As3Client {
    constructor(versions, as3MetaData, mgmtClient) {
        this.version = versions;
        this.metaData = as3MetaData;
        this.mgmtClient = mgmtClient;
    }
    /**
     * get as3 tasks
     * @param task ID to get
     * if no task, returns all
     */
    getTasks(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = id ? `${constants_1.atcMetaData.as3.endPoints.tasks}/${id}`
                : constants_1.atcMetaData.as3.endPoints.tasks;
            return yield this.mgmtClient.makeRequest(url);
        });
    }
    /**
     * get AS3 declaration(s)
     *
     * ** extended/full are pretty much the same **
     *
     * @param options.expanded get extended/full declartion (includes default tmos settings)
     */
    getDecs(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [];
            // if we have a tenant, start building the string
            let str = (options === null || options === void 0 ? void 0 : options.tenant) ? `/${options.tenant}` : '';
            if (options === null || options === void 0 ? void 0 : options.expanded) {
                params.push('show=expanded');
            }
            // build/append params to string
            str
                = params.length > 0
                    ? `${str}?${params.join('&')}`
                    : str;
            return yield this.mgmtClient.makeRequest(`${constants_1.atcMetaData.as3.endPoints.declare}${str}`);
        });
    }
    /**
     * Post AS3 delcaration
     * ** async by default **
     * @param data delaration to post
     */
    postDec(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const uri = [constants_1.atcMetaData.as3.endPoints.declare, '?async=true'];
            return yield this.mgmtClient.makeRequest(uri.join(''), {
                method: 'POST',
                data
            })
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                const asyncUrl = `${constants_1.atcMetaData.as3.endPoints.tasks}/${resp.data.id}`;
                return yield this.mgmtClient.followAsync(asyncUrl);
            }));
        });
    }
    /**
     * Remove AS3 tenant - works with both bigip and bigiq
     *
     * ** target parameter is optional!!! **
     *
     * ```json
     * {
     *      "class": "AS3",
     *      "declaration": {
     *          "class": "ADC",
     *          "schemaVersion": "3.0.0",
     *          "target": "192.168.200.13",
     *          "tenant1": {
     *              "class": "Tenant"
     *          }
     *      }
     * }
     * ```
     *
     * @param tenant tenant to delete
     * @param dec empty declaration to remove from multi-target system
     */
    // async deleteTenant(x: string): Promise<HttpResponse>;
    // async deleteTenant(x: as3Dec): Promise<HttpResponse>;
    deleteTenant(x) {
        return __awaiter(this, void 0, void 0, function* () {
            // if (typeof x === 'string' || x instanceof String) {
            if (typeof x === 'string') {
                x = {
                    class: 'AS3',
                    declaration: {
                        class: 'ADC',
                        schemaVersion: '3.0.0',
                        [x]: {
                            class: 'Tenant'
                        }
                    }
                };
            }
            // while the "DELETE" http method is waaay easier, this method works for all situations, including bigiq multi-target/tenant
            return yield this.mgmtClient.makeRequest(constants_1.atcMetaData.as3.endPoints.declare, {
                method: 'POST',
                data: x
            });
        });
    }
    /**
     * parse as3 declare responses into target/tenant/declaration lists.
     * This data can be used to repost declarations from multi-target/tenant responses.
     * This was inspired by what is needed for the extension to list and repost decs in the view
     * - todo: provide better typing for this entire function 'any'=bad
     * @param x delcare endpoint response
     */
    parseDecs(x) {
        return __awaiter(this, void 0, void 0, function* () {
            const tarTens = [];
            if (Array.isArray(x)) {
                // loop through targets/devices
                x.forEach((el) => {
                    // start object that represents target
                    const target = {
                        [el.target.address]: {}
                    };
                    Object.entries(el).forEach(([key, val]) => {
                        if (misc_1.isObject(val) && key !== 'target' && key !== 'controls') {
                            // append/overwrite object details for each tenant
                            target[el.target.address][key] = val;
                            target[el.target.address].target = el.target;
                            target[el.target.address].id = el.id;
                            target[el.target.address].schemaVersion = el.schemaVersion;
                            target[el.target.address].updateMode = el.updateMode;
                        }
                    });
                    tarTens.push(target);
                });
            }
            else {
                /**
                 * should be a single bigip tenants object
                 * 	loop through, return object keys
                 */
                for (const [tenant, dec] of Object.entries(x)) {
                    if (misc_1.isObject(dec) && tenant !== 'controls' && tenant !== 'target') {
                        // rebuild each tenant as3 dec
                        tarTens.push({
                            [tenant]: {
                                class: 'AS3',
                                schemaVersion: x.schemaVersion,
                                updateMode: x.updateMode,
                                [tenant]: dec
                            }
                        });
                    }
                }
            }
            return tarTens;
        });
    }
}
exports.As3Client = As3Client;
//# sourceMappingURL=as3Client.js.map