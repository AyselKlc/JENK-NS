"use strict";
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFakeToken = exports.getRandomInt = exports.getF5Client = exports.getMgmtClient = exports.ipv6Host = exports.defaultPassword = exports.defaultUser = exports.defaultPort = exports.defaultHost = void 0;
const f5Client_1 = require("../bigip/f5Client");
const mgmtClient_1 = require("../bigip/mgmtClient");
const misc_1 = require("./misc");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { localDev } from '../../tests/localTestDevice'
exports.defaultHost = '192.0.2.1';
exports.defaultPort = 443;
exports.defaultUser = 'admin';
exports.defaultPassword = '@utomateTheW0rld!';
exports.ipv6Host = '[2607:f0d0:1002:51::5]';
function getMgmtClient() {
    return new mgmtClient_1.MgmtClient(exports.defaultHost, exports.defaultUser, exports.defaultPassword);
}
exports.getMgmtClient = getMgmtClient;
/**
 * Returns F5Client with requested details
 */
function getF5Client(opts) {
    // setEnvs();
    const newOpts = {};
    // build F5Client options
    if (opts === null || opts === void 0 ? void 0 : opts.port) {
        newOpts.port = opts.port;
    }
    if (opts === null || opts === void 0 ? void 0 : opts.provider) {
        newOpts.provider = opts.provider;
    }
    // return new F5Client(
    //     localDev.host,
    //     localDev.user,
    //     localDev.password,
    //     newOpts
    // );
    return new f5Client_1.F5Client((opts === null || opts === void 0 ? void 0 : opts.ipv6) ? exports.ipv6Host : exports.defaultHost, exports.defaultUser, exports.defaultPassword, newOpts ? newOpts : undefined);
}
exports.getF5Client = getF5Client;
/**
 * inclusive random number generator
 *
 * @param min
 * @param max
 */
function getRandomInt(min, max) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive 
}
exports.getRandomInt = getRandomInt;
/**
 * generates a fake auth token with random value
 *  - passes back username/provider
 */
function getFakeToken(userName, authProviderName) {
    return {
        token: {
            token: misc_1.getRandomUUID(8),
            timeout: getRandomInt(300, 600),
            userName,
            authProviderName
        }
    };
}
exports.getFakeToken = getFakeToken;
//# sourceMappingURL=testingUtils.js.map