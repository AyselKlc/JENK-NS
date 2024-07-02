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
exports.sortTreeItems = exports.InventoryTreeProvider = void 0;
const vscode_1 = require("vscode");
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
class InventoryTreeProvider {
    constructor(context, logger, ngxFS) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.documents = [];
        this.instFiles = {};
        this.ngxIcon = path_1.default.join(__dirname, "..", "images", "NGINX-product-icon.svg");
        this.ngxPlusIcon = path_1.default.join(__dirname, "..", "images", "NGINX-Plus-product-icon-RGB.svg");
        this.context = context;
        this.logger = logger;
        this.ngxFs = ngxFS;
    }
    /**
     * refresh tree view
     */
    async refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    async clear() {
        this.nim = undefined;
        this.inventory = undefined;
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        let treeItems = [];
        if (!this.nim) {
            // not connected, so don't try to populate anything
            return treeItems;
        }
        if (element) {
            // update url for config reset or nim
            const url = (this.resetInstanceConfigs === element.label) ?
                `${this.nim.api.instances}/${element.deviceId}/config?current=true` : `${this.nim.api.instances}/${element.deviceId}/config`;
            // clear reset flag if set
            if (this.resetInstanceConfigs === element.label) {
                this.resetInstanceConfigs = undefined;
            }
            // get children of selected item
            await this.nim.makeRequest(url)
                .then(resp => {
                // start building file list for host
                // const fileTracker: InvFileSet = { hostname: element.label, files: []};
                const files = [];
                resp.data.files.forEach((el) => {
                    // add files to file tracker
                    // this.instFiles?[element.label].push(el.name, 'asdf'): 
                    files.push(el.name);
                    const uri = vscode_1.Uri.parse(path_1.default.join(element.label, el.name));
                    if (!el.contents) {
                        debugger;
                    }
                    this.ngxFs.loadFile(uri, Buffer.from(el.contents, 'base64'), element.deviceId);
                    const txt = js_yaml_1.default.dump({
                        name: el.name,
                        created: el.created,
                        modified: el.modified
                    }, { indent: 4 });
                    const decoded = Buffer.from(el.contents, 'base64').toString('ascii');
                    const tooltip = new vscode_1.MarkdownString()
                        .appendCodeblock(txt, 'yaml');
                    // .appendMarkdown('\n---\n')
                    // .appendText(decoded);
                    const tiPath = path_1.default.join(element.label, el.name);
                    // const description = 
                    treeItems.push(new InvTreeItem(el.name, el.modified, tooltip, new vscode_1.ThemeIcon('file'), 'config', vscode_1.TreeItemCollapsibleState.None, element.deviceId, {
                        command: 'nginx.displayConfigFile',
                        title: '',
                        arguments: [`ngx:/${tiPath}`]
                    }));
                });
                // inject host file list back into main class
                this.instFiles = { [element.label]: files };
            });
        }
        else {
            if (this.inventory && this.inventory.list.length > 0) {
                this.inventory.list.map((el) => {
                    const txt = js_yaml_1.default.dump(el, { indent: 4 });
                    const tooltip = new vscode_1.MarkdownString()
                        .appendCodeblock(txt, 'yaml');
                    const icon = el.nginx.type === 'plus'
                        ? this.ngxPlusIcon : this.ngxIcon;
                    treeItems.push(new InvTreeItem(el.hostname, (el.nginx.type || ''), tooltip, icon, 'instance', vscode_1.TreeItemCollapsibleState.Collapsed, el.instance_id, undefined));
                });
            }
        }
        return treeItems;
    }
    /**
     * fetch nginx instance information
     */
    async getInventory() {
        var _a;
        this.inventory = undefined;
        await ((_a = this.nim) === null || _a === void 0 ? void 0 : _a.makeRequest(this.nim.api.instances).then(resp => {
            this.inventory = resp.data;
            this.refresh();
        }));
    }
}
exports.InventoryTreeProvider = InventoryTreeProvider;
/**
 * sort tree items by label
 */
function sortTreeItems(treeItems) {
    return treeItems.sort((a, b) => {
        const x = a.label.toLowerCase();
        const y = b.label.toLowerCase();
        if (x < y) {
            return -1;
        }
        else {
            return 1;
        }
    });
}
exports.sortTreeItems = sortTreeItems;
// class NginxContDoc implements TextDocument {
// }
/**
 * bigiq class tree item
 */
class InvTreeItem extends vscode_1.TreeItem {
    constructor(label, description, tooltip, iconPath, contextValue, collapsibleState, deviceId, command) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.tooltip = tooltip;
        this.iconPath = iconPath;
        this.contextValue = contextValue;
        this.collapsibleState = collapsibleState;
        this.deviceId = deviceId;
        this.command = command;
    }
}
//# sourceMappingURL=inventoryTreeProvider.js.map