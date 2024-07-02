/* eslint-disable @typescript-eslint/ban-types */
/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHash = exports.isArray = exports.isObject = exports.getRandomUUID = exports.wait = void 0;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * delays async response of function
 * https://stackoverflow.com/questions/38956121/how-to-add-delay-to-promise-inside-then
 * @param ms time to wait
 * @param value value to return
 */
function wait(ms, value) {
    return new Promise((resolve) => setTimeout(resolve, ms, value));
}
exports.wait = wait;
/**
 * builds a short randon uuid - just for some randomness during testing
 *
 * @param length
 * @example
 * getRandomUUID(8) // returns 8pSJP15R
 *
 */
function getRandomUUID(length, options) {
    // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    // was using the last part of a uuidv4 string, but that required an external dep to generate the uuid
    const result = [];
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '1234567890';
    const set = [];
    if (options === null || options === void 0 ? void 0 : options.simple) {
        set.push(lowerCase, numbers);
    }
    else {
        set.push(upperCase, lowerCase, numbers);
    }
    const chars = set.join('');
    for (let i = 0; i < length; i++) {
        result.push(chars.charAt(Math.floor(Math.random() * chars.length)));
    }
    return result.join('');
}
exports.getRandomUUID = getRandomUUID;
// https://stackoverflow.com/questions/8834126/how-to-efficiently-check-if-variable-is-array-or-object-in-nodejs-v8
function isObject(a) {
    // the TS v4.0+ spec recommends using the following to detect an object...
    // value !== null && typeof value === 'object'
    return (!!a) && (a.constructor === Object);
}
exports.isObject = isObject;
function isArray(a) {
    return (!!a) && (a.constructor === Array);
}
exports.isArray = isArray;
/**
 * Verify file against provided hash
 *
 * @param file local file location
 * @param hash expected SHA 256 hash
 *
 * @returns true/false based on hash verification result
 */
function verifyHash(file, extensionHash) {
    const createHash = crypto_1.default.createHash('sha256');
    const input = fs_1.default.readFileSync(file);
    createHash.update(input);
    const computedHash = createHash.digest('hex');
    if (extensionHash !== computedHash) {
        return false;
    }
    return true;
}
exports.verifyHash = verifyHash;
//# sourceMappingURL=misc.js.map