/**
 * Copyright 2021 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getText = exports.getPassword = exports.clearPassword = exports.savePassword = void 0;
const vscode_1 = require("vscode");
const keytar_1 = __importDefault(require("keytar"));
const logger_1 = __importDefault(require("f5-conx-core/dist/logger"));
const logger = logger_1.default.getLogger();
// todo: use new vscode integrated secretes api (it's baked in keytar...)
// https://stackoverflow.com/questions/66568692/how-to-use-the-vscode-secretstorage
// https://code.visualstudio.com/api/references/vscode-api#SecretStorage
// src/tree/registries/registryPasswords.ts
// https://github.com/microsoft/vscode-docker/commit/fbd25d4bedad5c2360df274c278908d093e6d3cb#diff-79b031eb3ade4f96eb1cfecec2b4f71a2ab8f19a966c3f531e1dcca57bee4341
// const password = context.secrets.get(host.device)
async function savePassword(device, password) {
    // logger
    return await keytar_1.default.setPassword('nimHosts', device, password);
}
exports.savePassword = savePassword;
async function clearPassword(device) {
    // logger
    // return await keytar.setPassword('nimHosts', device, password);
    if (device) {
        // passed in from view click or deviceClient
        logger.debug('CLEARING KEYTAR PASSWORD CACHE for', device);
        return await keytar_1.default.deletePassword('nimHosts', device);
    }
    else {
        // get list of items in keytar for the 'f5Hosts' service
        logger.debug('CLEARING KEYTAR PASSWORD CACHE');
        await keytar_1.default.findCredentials('nimHosts').then(list => {
            // map through and delete all
            list.map(item => keytar_1.default.deletePassword('nimHosts', item.account));
        });
        /**
         * future: setup clear all to return an array of touples to show which
         *  device passwords got cleared
         */
    }
}
exports.clearPassword = clearPassword;
/**
 * Get password from keytar or prompt
 * @param device nginx/Host/Device in <user>&#64;<host/ip> format
 */
async function getPassword(device) {
    // logger.debug(`getPassword Device: ${device}`);
    let password = await keytar_1.default.getPassword('nimHosts', device);
    // logger.debug(`IS PASSWORD IN KEYTAR?: ${password}`);
    if (!password) {
        // logger.debug(`NO PASSWORD IN KEYTAR! - PROMPTING!!! - ${password}`);
        password = await vscode_1.window.showInputBox({
            placeHolder: 'Basic Auth Password',
            prompt: 'Input password: ',
            password: true,
            ignoreFocusOut: true
        })
            .then(password => {
            if (!password) {
                throw new Error('User cancelled password input');
            }
            // logger.debug(`USER INPUT PASSWORD!!! - ${password}`);
            return password;
        });
    }
    // logger.debug(`PASSWORD BOUT TO BE RETURNED!!! - ${password}`);
    return password;
}
exports.getPassword = getPassword;
/**
 * capture entire active editor text or selected text
 */
async function getText() {
    // get editor window
    var editor = vscode_1.window.activeTextEditor;
    if (editor) {
        // capture selected text or all text in editor
        if (editor.selection.isEmpty) {
            return editor.document.getText(); // entire editor/doc window
        }
        else {
            return editor.document.getText(editor.selection); // highlighted text
        }
    }
    else {
        // logger.warn('getText was called, but no active editor... this should not happen');
        throw new Error('getText was called, but no active editor... this should not happen'); // No open/active text editor
    }
}
exports.getText = getText;
//# sourceMappingURL=utils.js.map