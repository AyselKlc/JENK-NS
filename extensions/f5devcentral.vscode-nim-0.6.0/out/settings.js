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
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
/**
 * started setting up the class to manage any settings interaction with the extension.
 *
 * **not actually used yet, the hosts tree is pulling hosts config directly...**
 */
class Settings {
    constructor(context) {
        this.hosts = [];
        // boogers
        this.logLevel = process.env.F5_CONX_CORE_LOG_LEVEL || 'INFO';
        this.init();
    }
    /**
     * load settings from extension settings file
     */
    async load() {
        this.hosts = vscode_1.workspace.getConfiguration().get('f5.nim.hosts') || [];
        process.env.F5_CONX_CORE_LOG_LEVEL = vscode_1.workspace.getConfiguration().get('f5.nim.logLevel', 'INFO');
        this.logLevel = process.env.F5_CONX_CORE_LOG_LEVEL;
    }
    /**
     * initialize settings at launch
     */
    async init() {
        this.load();
    }
}
exports.default = Settings;
//# sourceMappingURL=settings.js.map