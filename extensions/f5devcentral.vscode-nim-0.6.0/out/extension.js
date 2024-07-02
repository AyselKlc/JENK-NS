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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const os = __importStar(require("os"));
const vscode_1 = require("vscode");
const logger_1 = __importDefault(require("f5-conx-core/dist/logger"));
const hostsTreeProvider_1 = require("./hostsTreeProvider");
const settings_1 = __importDefault(require("./settings"));
const inventoryTreeProvider_1 = require("./inventoryTreeProvider");
const scanTreeProvider_1 = require("./scanTreeProvider");
const nimClient_1 = require("./nimClient");
const events_1 = require("events");
const utils_1 = require("./utils");
const ngxFileSystem_1 = require("./ngxFileSystem");
// https://stackoverflow.com/questions/51070138/how-to-import-package-json-into-typescript-file-without-including-it-in-the-comp
// import * as pkjs from '../package.json'
const logger = logger_1.default.getLogger();
logger.console = false;
// delete process.env.F5_CONX_CORE_LOG_LEVEL;
// process.env.F5_CONX_CORE_LOG_LEVEL = 'DEBUG';
if (!process.env.F5_CONX_CORE_LOG_LEVEL) {
    // if this isn't set by something else, set it to debug for dev
    process.env.F5_CONX_CORE_LOG_LEVEL = 'DEBUG';
}
// create OUTPUT channel
const f5OutputChannel = vscode_1.window.createOutputChannel('nim');
// inject vscode output into logger
logger.output = function (log) {
    f5OutputChannel.appendLine(log);
};
function activate(context) {
    const eventer = new events_1.EventEmitter()
        .on('log-http-request', msg => logger.httpRequest(msg))
        .on('log-http-response', msg => logger.httpResponse(msg))
        .on('log-debug', msg => logger.debug(msg))
        .on('log-info', msg => logger.info(msg))
        .on('log-warn', msg => logger.warning(msg))
        .on('log-error', msg => logger.error(msg));
    // hook up failed auth event
    eventer.on('failedAuth', x => {
        // log the error
        logger.error('auth failed', x.err);
        // clear the password
        utils_1.clearPassword(x.device);
        // call disconnect
        vscode_1.commands.executeCommand('nim.disConnect');
    });
    const settings = new settings_1.default(context);
    process.on('unhandledRejection', error => {
        logger.error(' --- unhandledRejection ---', error);
    });
    vscode_1.workspace.onDidChangeConfiguration(() => {
        logger.info('NIM EXTENSION SETTINGS CHANGED!');
        settings.load();
        nginxHostsTree.refresh();
    });
    // todo: add extra package details!
    logger.info(`nim Extension Host details: `, {
        hostOS: os.type(),
        platform: os.platform(),
        release: os.release(),
        userInfo: `${JSON.stringify(os.userInfo())}`
    });
    let nim;
    const nginxHostsTree = new hostsTreeProvider_1.NginxHostTreeProvider(context, settings, logger);
    const hostsTreeView = vscode_1.window.createTreeView('hostsView', {
        treeDataProvider: nginxHostsTree,
        showCollapseAll: true
    });
    hostsTreeView.onDidChangeVisibility(e => {
        // set this up to respect if onConnect/terminal has been setup
        if (e.visible) {
            f5OutputChannel.show();
        }
    });
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.refreshHostsTree', () => {
        nginxHostsTree.refresh();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.config', async (newHost) => {
        vscode_1.commands.executeCommand('workbench.action.openSettingsJson', '@ext:f5.nim.hosts');
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.addHost', async (newHost) => {
        // commands.executeCommand('workbench.action.openSettingsJson', '@ext:f5.nim.hosts');
        return await nginxHostsTree.addDevice(newHost);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.removeHost', async (hostID) => {
        return await nginxHostsTree.removeDevice(hostID);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.editHost', async (hostID) => {
        return await nginxHostsTree.editDevice(hostID);
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.connect', async (host) => {
        vscode_1.commands.executeCommand('nim.disConnect');
        // curl -sku ted:benrocks https://dc0bec8a-1378-477d-b1a1-af6f87fbd190.access.udf.f5.com/api/v0/about/license
        await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: `Connecting to NIM`,
            cancellable: true
        }, async () => {
            nim = new nimClient_1.NimClient(host, eventer);
            await nim.connect()
                .then(() => {
                vscode_1.commands.executeCommand('setContext', 'nim.connected', true);
                inventoryTree.nim = nim;
                inventoryTree.getInventory();
                // inventoryTree.refresh();
                scanTree.nim = nim;
                scanTree.getScanStatus();
                scanTree.getScanServers();
                // scanTree.refresh();
                if (!nim) {
                    return;
                }
                // save device license/system details for offline hosts hover
                nginxHostsTree.saveHostDetails(nim);
                // debugger;
            })
                .catch(err => {
                logger.error('nim connect failed', err);
            });
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.disConnect', async (hostID) => {
        vscode_1.commands.executeCommand('setContext', 'nim.connected', false);
        inventoryTree.clear();
        // inventoryTreeView.message = "dis-connected";
        scanTree.clear();
        // scanTreeView.message = "dis-connected";
        nim = undefined;
    }));
    // ##############################################################################
    // ##############################################################################
    // ##############################################################################
    //
    //
    //          inventory
    //
    //
    // ##############################################################################
    // ##############################################################################
    // ##############################################################################
    const ngxFS = new ngxFileSystem_1.NgxFsProvider();
    context.subscriptions.push(vscode_1.workspace.registerFileSystemProvider('ngx', ngxFS, { isCaseSensitive: true }));
    const inventoryTree = new inventoryTreeProvider_1.InventoryTreeProvider(context, logger, ngxFS);
    const inventoryTreeView = vscode_1.window.createTreeView('inventoryView', {
        treeDataProvider: inventoryTree,
        showCollapseAll: true
    });
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.refreshInventory', () => {
        inventoryTree.refresh();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.displayConfigFile', (item) => {
        vscode_1.window.showTextDocument(vscode_1.Uri.parse(item));
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.resetConfigs', (item) => {
        if (item.label) {
            // click from tree icon
            inventoryTree.resetInstanceConfigs = item.label;
        }
        if (item.path) {
            // click from editor icon -> extract host/label from filePath
            inventoryTree.resetInstanceConfigs = item.path.split('/')[1];
        }
        inventoryTree.refresh();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.newConfig', (item) => {
        // item should be inventory instance
        vscode_1.window.showInputBox({
            prompt: 'input file name (including path)',
            value: '/etc/nginx/test.conf',
            placeHolder: '/etc/nginx/nginx.conf'
        }).then(filePath => {
            if (filePath) {
                // ngxFS.loadFile(
                //     Uri.parse(`ngx:/${item.label}${filePath}`),
                //     Buffer.from(''),
                //     item.id
                // );
                vscode_1.commands.executeCommand('nginx.postConfigFile', {
                    uri: vscode_1.Uri.parse(`ngx:/${item.label}${filePath}`),
                    stat: item.deviceId,
                    newFile: true
                });
                inventoryTree.refresh();
            }
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.saveConfigFile', (item) => {
        vscode_1.commands.executeCommand('workbench.action.files.save');
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.postConfigFile', (item) => {
        if (!nim) {
            return;
        }
        let id;
        if (item.uri && item.stat.id) {
            // command executed from editor save
            id = item.stat.id;
        }
        else {
            // command excuted from new file
            id = item.stat;
        }
        // const uriB = uri;
        // const instance_id = stat.deviceId;
        // const encoded = Buffer.from(content).toString('base64');
        const api = `${nim.api.instances}/${id}/config`;
        const pathy = item.uri.path.split('/');
        const hostname = pathy.splice(1, 1);
        // need to fetch/update files from instance before continueing (or at least check since files don't get populated till the view item is expanded)
        const files = inventoryTree.instFiles[hostname[0]].map(el => {
            const stat = ngxFS.stat(vscode_1.Uri.parse(`ngx:/${hostname[0]}${el}`));
            const contnt = ngxFS.readFile(vscode_1.Uri.parse(`ngx:/${hostname[0]}${el}`));
            return {
                name: el,
                contents: Buffer.from(contnt).toString('base64'),
                created: new Date(stat.ctime).toISOString(),
                modified: new Date(stat.mtime).toISOString(),
            };
        });
        if (item.newFile) {
            // append new file to all the existing files
            files.push({
                name: pathy.join('/'),
                contents: Buffer.from('# beginning of a new nginx file').toString('base64'),
                created: new Date().toISOString()
            });
        }
        nim.makeRequest(api, {
            method: 'POST',
            data: {
                instance_id: id,
                modified: new Date().toISOString(),
                files
            }
        })
            .then(resp => {
            // debugger;
            logger.info('nginx.postConfigFile', ' - successful - ');
            inventoryTree.refresh();
            // use the id/hostname to clear the directory and refresh tree?
        })
            .catch(err => {
            // logger.error(err);
            logger.info('nginx.postConfigFile', ' - failed - ');
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.deleteConfig', (item) => {
        // window.showTextDocument( Uri.parse(item) );
        if (!nim) {
            return;
        }
        ;
        const uri = item.command.arguments[0];
        // find and delete the entry in the tree view
        const pathy = vscode_1.Uri.parse(uri).path.split('/');
        const hostname = pathy.splice(1, 1);
        const entry = inventoryTree.instFiles[hostname[0]].indexOf(pathy.join('/'));
        inventoryTree.instFiles[hostname[0]].splice(entry, 1);
        try {
            // delete file from ngx, then call post configs function
            ngxFS.delete(vscode_1.Uri.parse(uri));
        }
        catch (e) {
            debugger;
        }
        vscode_1.commands.executeCommand('nginx.postConfigFile', {
            uri: vscode_1.Uri.parse(uri),
            stat: item.deviceId,
        });
        // inventoryTree.refresh();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.analyzeConfigs', (item) => {
        // window.showTextDocument( Uri.parse(item) );
        if (!nim) {
            return;
        }
        ;
        const api = `${nim.api.instances}/${item.deviceId}/config/analyze`;
        nim.makeRequest(api, {
            method: 'POST',
            data: {}
        })
            .then(resp => {
            // debugger;
            logger.info('nginx.analyzConfigs', ' - successful - ');
            inventoryTree.refresh();
            vscode_1.window.showInformationMessage('NIM: Analyze Configs Successful');
            // use the id/hostname to clear the directory and refresh tree?
        })
            .catch(err => {
            // logger.error(err);
            logger.info('nginx.analyzConfigs', ' - failed - ');
        });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.publishConfigs', (item) => {
        // window.showTextDocument( Uri.parse(item) );
        if (!nim) {
            return;
        }
        ;
        // if item type === Uri from editor context
        // or if item type === viewItem from view context
        if (!item.deviceId) {
            // got uri item from button top right of editor, not from view item
            item.deviceId = ngxFS.stat(item).id;
            // debugger;
        }
        const api = `${nim.api.instances}/${item.deviceId}/config/publish`;
        nim.makeRequest(api, {
            method: 'POST',
            data: {
                instance_id: item.deviceId,
                force: true
            }
        })
            .then(resp => {
            // debugger;
            logger.info('nginx.publishConfigs', ' --- SUCCESSFUL --- ');
            inventoryTree.refresh();
            vscode_1.window.showInformationMessage('NIM: Publish Configs Successful');
            // use the id/hostname to clear the directory and refresh tree?
        })
            .catch(err => {
            // logger.error(err);
            logger.info('nginx.publishConfigs', ' --- FAILED --- ');
        });
    }));
    // ##############################################################################
    // ##############################################################################
    // ##############################################################################
    //
    //
    //          scan
    //
    //
    // ##############################################################################
    // ##############################################################################
    // ##############################################################################
    const scanTree = new scanTreeProvider_1.scanTreeProvider(context, logger);
    const scanTreeView = vscode_1.window.createTreeView('scanView', {
        treeDataProvider: scanTree,
        showCollapseAll: true
    });
    // scanTreeView.message = 'same as inventory tree view';
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.refreshScan', () => {
        scanTree.refresh();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nim.scanStart', async () => {
        await scanTree.scanStart();
        // await getText()
        //     .then(async text => {
        //         await scanTree.scanStart(text);
        //     })
        //     .catch(err => {
        //         logger.error('nim.scanStart failed', err);
        //     });
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.scanUpdateCidr', async () => {
        scanTree.scanUpdatecidr();
    }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.scanUpdatePorts', async () => {
        scanTree.scanUpdatePorts();
    }));
    // context.subscriptions.push(commands.registerCommand('nginx.scanUpdatePorts', async () => {
    //     scanTree.scanUpdatePorts();
    // }));
    context.subscriptions.push(vscode_1.commands.registerCommand('nginx.deleteScanServer', async (item) => {
        const serverDetails = scanTree.scanServers.filter(el => el.ip === item.label)[0];
        for (const port of serverDetails.ports) {
            const api = `${nim === null || nim === void 0 ? void 0 : nim.api.scanServers}/${item.label}/${port}`;
            nim === null || nim === void 0 ? void 0 : nim.makeRequest(api, {
                method: 'DELETE'
            }).catch(err => {
                debugger;
            });
        }
        // refresh scan servers data
        scanTree.getScanServers();
        // // refresh tree view
        scanTree.refresh();
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map