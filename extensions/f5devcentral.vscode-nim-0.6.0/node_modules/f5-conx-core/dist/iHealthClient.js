/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
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
exports.IhealthClient = void 0;
// import { makeRequest } from "./utils/f5Https";
/**
 * basic frame work to interact with iHealth
 *  from Sergio Pereira
 */
class IhealthClient {
    constructor(username, password) {
        this._api_host = 'https://ihealth-api.f5.com';
        this._host = 'https://api.f5.com';
        this._headers = { 'Accept': 'application/vnd.f5.ihealth.api.v1.0+json' };
        this._authURL = '/auth/pub/sso/login/ihealth-api';
        this._cookies = {};
        this.username = username;
        this._password = password;
    }
    /**
     * Login to iHealth with user creds and save auth cookie
     */
    login() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    /**
     * clear login token
     *  - to be used when we detect login failure scenario
     */
    clearLogin() {
    }
    /**
     * list qkview IDs = '/qkview-analyzer/api/qkviews/'
     */
    listQkviews() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._cookies) {
                this.login();
            }
            // const resp = makeRequest(this._api_host, '/qkview-analyzer/api/qkviews/', )
        });
    }
    /**
     * list commands = '/qkview-analyzer/api/qkviews/{qkview_id}/commands'
     *
     * @param id qkview-id
     */
    listCommands(id) {
        return __awaiter(this, void 0, void 0, function* () {
            // makeRequest(this._api_host, '/qkview-analyzer/api/qkviews/', )
        });
    }
    /**
     * cmd output = '/qkview-analyzer/api/qkviews/{qkview_id}/commands/{a}'
     *
     * @param id qkview-id
     * @param cmd command to execute on qkview
     */
    qkviewCommand(id, cmd) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    /**
     * get diagnostics for qkview
     *  - '/qkview-analyzer/api/qkviews/{qkview_id}/diagnostics?set=hit'
     * @param id qkview-id
     */
    getDiagnostics(id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.IhealthClient = IhealthClient;
//# sourceMappingURL=iHealthClient.js.map