/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoClient = void 0;
class DoClient {
    constructor(versions, doMetaData, mgmtClient) {
        this.version = versions;
        this.metaData = doMetaData;
        this.mgmtClient = mgmtClient;
    }
}
exports.DoClient = DoClient;
//# sourceMappingURL=doClient.js.map