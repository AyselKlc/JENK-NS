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
exports.CfClient = void 0;
class CfClient {
    constructor(versions, cfMetaData, mgmtClient) {
        this.version = versions;
        this.metaData = cfMetaData;
        this.mgmtClient = mgmtClient;
    }
    inspect() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(this.metaData.endPoints.inspect);
            // return 'cf-inspect';
        });
    }
    declare() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(this.metaData.endPoints.declare);
            // return 'cf-deplare';
        });
    }
    trigger() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(this.metaData.endPoints.trigger);
            // return 'cf-trigger';
        });
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(this.metaData.endPoints.reset);
            // return 'cf-reset';
        });
    }
}
exports.CfClient = CfClient;
//# sourceMappingURL=cfClient.js.map