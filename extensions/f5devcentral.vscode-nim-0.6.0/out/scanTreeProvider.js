/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com or github.com/f5devcentral.
 */
'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTreeItems = exports.scanTreeProvider = void 0;
const vscode_1 = require("vscode");
const js_yaml_1 = __importDefault(require("js-yaml"));
class scanTreeProvider {
    constructor(context, logger) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.scanServers = [];
        this.scanNetwork = '10.0.0.0/24';
        this.scanPorts = ['0'];
        this.context = context;
        this.logger = logger;
    }
    /**
     * refresh tree view
     */
    refresh() {
        // this.scan();
        this._onDidChangeTreeData.fire(undefined);
    }
    async clear() {
        this.nim = undefined;
        this.scanServers.length = 0;
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        var _a;
        let treeItems = [];
        if (!this.nim) {
            // not connected, so don't try to populate anything
            return treeItems;
        }
        if (element) {
            // get children of selected item
            if (element.label === 'Servers') {
                this.scanServers.forEach(el => {
                    const tooltip = new vscode_1.MarkdownString()
                        .appendCodeblock(js_yaml_1.default.dump(el), 'yaml');
                    const desc = el.ports.join('/');
                    treeItems.push(new ScanTreeItem(el.ip, desc, tooltip, 'scanServer', vscode_1.TreeItemCollapsibleState.None));
                });
            }
            if (element.label === 'Scan') {
                treeItems.push(new ScanTreeItem('Network CIDR', this.scanNetwork, 'Click to update', 'scanCidr', vscode_1.TreeItemCollapsibleState.None, {
                    command: 'nginx.scanUpdateCidr',
                    title: '',
                }), new ScanTreeItem('Ports', this.scanPorts.join('/'), 'Click to update', 'scanPorts', vscode_1.TreeItemCollapsibleState.None, {
                    command: 'nginx.scanUpdatePorts',
                    title: '',
                }));
            }
        }
        else {
            const scanStatus = new vscode_1.MarkdownString()
                .appendCodeblock(js_yaml_1.default.dump(this.scanStatus), 'yaml');
            // todo: build count and hover details
            treeItems.push(new ScanTreeItem('Scan', ((_a = this.scanStatus) === null || _a === void 0 ? void 0 : _a.status) || '', scanStatus, 'scanStatusHeader', vscode_1.TreeItemCollapsibleState.Collapsed), new ScanTreeItem('Servers', this.scanServers.length.toString() || '', '', 'scanServers', vscode_1.TreeItemCollapsibleState.Collapsed));
        }
        return treeItems;
    }
    /**
     * get scan status
     */
    async getScanStatus() {
        var _a;
        this.scanStatus = undefined;
        (_a = this.nim) === null || _a === void 0 ? void 0 : _a.makeRequest(this.nim.api.scan).then(resp => {
            this.scanStatus = resp.data;
            this.refresh();
        });
    }
    /**
     * get scan status
     */
    async getScanServers() {
        var _a;
        this.scanServers.length = 0;
        (_a = this.nim) === null || _a === void 0 ? void 0 : _a.makeRequest(this.nim.api.scanServers).then(resp => {
            // this.scanServers = resp.data.list;
            resp.data.list.forEach((server) => {
                // try to find an existing server IP
                const serverIndex = this.scanServers.findIndex(el => el.ip === server.ip);
                if (serverIndex > 0) {
                    // existing server item, add port
                    this.scanServers[serverIndex].ports.push(server.port);
                }
                else {
                    this.scanServers.push({
                        instance_id: server.instance_id,
                        ip: server.ip,
                        ports: [server.port],
                        app: server.app,
                        version: server.version,
                        fingerprinted: server.fingerprinted,
                        cves: server.cves,
                        managed_id: server.managed_id,
                        lastseen: server.lastseen,
                        added: server.added
                    });
                }
            });
            this.refresh();
        });
    }
    /**
     * get scan status
     */
    async scanUpdatecidr() {
        await vscode_1.window.showInputBox({
            value: this.scanNetwork,
            prompt: 'Update network CIDR to scan'
        }).then(x => {
            if (x) {
                this.scanNetwork = x;
                this.refresh();
            }
        });
    }
    /**
     * get scan status
     */
    async scanUpdatePorts() {
        await vscode_1.window.showInputBox({
            value: this.scanPorts.join(','),
            prompt: 'Update ports to scan',
            placeHolder: 'comma seperated numbers "80,443"'
        }).then(x => {
            if (x) {
                // todo: validate input, only numbers with commas
                this.scanPorts = x.split(',');
                this.refresh();
            }
        });
    }
    /**
     * get scan status
     */
    async scanStart() {
        var _a;
        (_a = this.nim) === null || _a === void 0 ? void 0 : _a.makeRequest(this.nim.api.scan, {
            method: 'POST',
            data: {
                cidr: this.scanNetwork,
                ports: this.scanPorts
            }
        }).then(resp => {
            // just log that the scan is running?
            this.logger.debug('nim scan job start', resp);
        }).catch(err => {
            this.logger.debug('nim scan job start failed', err);
        });
    }
}
exports.scanTreeProvider = scanTreeProvider;
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
/**
 * bigiq class tree item
 */
class ScanTreeItem extends vscode_1.TreeItem {
    constructor(label, description, tooltip, contextValue, collapsibleState, command) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.tooltip = tooltip;
        this.contextValue = contextValue;
        this.collapsibleState = collapsibleState;
        this.command = command;
    }
}
//# sourceMappingURL=scanTreeProvider.js.map