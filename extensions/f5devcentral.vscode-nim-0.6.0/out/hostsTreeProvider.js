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
exports.NginxHostTreeItem = exports.NginxHostTreeProvider = void 0;
const js_yaml_1 = __importDefault(require("js-yaml"));
const path = require("path");
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
// icon listing for addin icons to key elements
// https://code.visualstudio.com/api/references/icons-in-labels#icon-listing
class NginxHostTreeProvider {
    constructor(context, settings, logger) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        /**
         * regex for confirming host entry <user>@<host/ip>:<port>
         */
        this.deviceRex = /^[\w-.]+$/;
        // private green = path.join(__dirname, "..", "images", "NGINX-Instance-Manager-logo_horizontal.svg");
        this.green = path.join(__dirname, "..", "images", "nim_logo.png");
        this.nginxHosts = [];
        this.context = context;
        this.logger = logger;
        this.settings = settings;
        this.loadHosts();
    }
    /**
     * load hosts from vscode workspace config
     *
     */
    async loadHosts() {
        this.nginxHosts = vscode_1.workspace.getConfiguration().get('f5.nim.hosts') || [];
    }
    /**
     * save hosts config
     */
    async saveHosts() {
        await vscode_1.workspace.getConfiguration()
            .update('f5.nim.hosts', this.nginxHosts, vscode_1.ConfigurationTarget.Global);
    }
    /**
     * save systema and license details about host
     */
    async saveHostDetails(nim) {
        // get index of host in the saved devices list
        const hostIndex = this.nginxHosts.findIndex(el => el.device === nim.host.device);
        // add the license and system details
        this.nginxHosts[hostIndex].license = nim.license;
        this.nginxHosts[hostIndex].system = nim.system;
        this.saveHosts();
        this.refresh();
    }
    /**
     * load hosts from config and refresh tree view
     */
    async refresh() {
        this.loadHosts();
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        const treeItems = [];
        if (element) {
            // do return children of the selected element
            // return treeItems;
        }
        else {
            this.nginxHosts.forEach((item) => {
                const tooltip = new vscode_1.MarkdownString(`## ${item.device}\n---\n`)
                    .appendCodeblock(js_yaml_1.default.dump(item), 'yaml');
                let description = 'none';
                for (const [key, value] of Object.entries(item.auth)) {
                    description = `${key}: ${value}`;
                }
                // const auth1 = item.auth
                const treeItem = new NginxHostTreeItem((item.label || item.device), description, tooltip, this.green, 'host', vscode_1.TreeItemCollapsibleState.None, {
                    command: 'nim.connect',
                    title: 'hostTitle',
                    arguments: [item]
                });
                treeItems.push(treeItem);
            });
        }
        return Promise.resolve(treeItems);
    }
    async addDevice(newHost) {
        if (!newHost) {
            // attempt to get user to input new device
            newHost = await vscode_1.window.showInputBox({
                prompt: 'NIM-Host with user',
                placeHolder: '<user>@<host/ip>',
                validateInput: function (value) {
                    const [authUser, host] = value.split('@');
                    if (!authUser || !host) {
                        return 'host or user not detected, use user@host/ip format';
                    }
                    // return value;
                },
                ignoreFocusOut: true
            })
                .then(el => {
                if (el) {
                    return el;
                }
                else {
                    throw new Error('user escapted new device input');
                }
            });
        }
        const [authUser, host] = newHost.split('@');
        // quick-n-dirty way, stringify the entire hosts config and search it for the host we are adding
        const devicesString = JSON.stringify(this.nginxHosts);
        if (!devicesString.includes(`\"${host}\"`) && this.deviceRex.test(host)) {
            this.nginxHosts.push({ device: host, auth: { basic: authUser } });
            this.saveHosts();
            // wait(500, this.refresh());
            return `${host} added to device configuration`;
        }
        else {
            this.logger.error(`${host} exists or invalid format: <user>@<host/ip>:<port>`);
            return 'FAILED - Already exists or invalid format: <user>@<host/ip>';
        }
    }
    async editDevice(hostID) {
        this.logger.debug(`Edit Host command:`, hostID);
        await vscode_1.window.showInputBox({
            prompt: 'Update Device/BIG-IP/Host',
            value: hostID.label,
            ignoreFocusOut: true
        })
            .then(input => {
            this.logger.info('user input', input);
            if (input === undefined || this.nginxHosts === undefined) {
                // throw new Error('Update device inputBox cancelled');
                this.logger.warning('Update device inputBox cancelled');
                return;
            }
            // const deviceRex = /^[\w-.]+@[\w-.]+(:[0-9]+)?$/;
            const devicesString = JSON.stringify(this.nginxHosts);
            if (!devicesString.includes(`\"${input}\"`) && this.deviceRex.test(input) && this.nginxHosts && hostID.label) {
                // get the array index of the modified device
                const modifiedDeviceIndex = this.nginxHosts.findIndex((x) => x.device === hostID.label);
                // update device using index
                this.nginxHosts[modifiedDeviceIndex].device = input;
                this.saveHosts();
                // wait(500, this.refresh());
            }
            else {
                this.logger.error(`${input} exists or invalid format: <host/ip>`);
            }
        });
    }
    async removeDevice(hostID) {
        this.logger.debug(`Remove Host command:`, hostID);
        const newNginxHosts = this.nginxHosts.filter((item) => {
            // return (item.device || item.label) === hostID.label ? false : true;
            if (item.device === hostID.label) {
                utils_1.clearPassword(item.device); // clear cached password for device
                return false;
            }
            else if (item.label === hostID.label) {
                utils_1.clearPassword(item.device); // clear cached password for device
                return false;
            }
            else {
                return true;
            }
        });
        if (this.nginxHosts.length === (newNginxHosts.length + 1)) {
            this.logger.debug('device removed');
            // clearPassword(hostID.label);	// clear cached password for device
            this.nginxHosts = newNginxHosts;
            this.saveHosts();
            // wait(500, this.refresh());
            return `successfully removed (${hostID.label} from devices configuration`;
        }
        else {
            this.logger.debug('something with remove device FAILED!!!');
            throw new Error('something with remove device FAILED!!!');
        }
    }
}
exports.NginxHostTreeProvider = NginxHostTreeProvider;
class NginxHostTreeItem extends vscode_1.TreeItem {
    constructor(label, description, tooltip, iconPath, contextValue, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.tooltip = tooltip;
        this.iconPath = iconPath;
        this.contextValue = contextValue;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
exports.NginxHostTreeItem = NginxHostTreeItem;
//# sourceMappingURL=hostsTreeProvider.js.map