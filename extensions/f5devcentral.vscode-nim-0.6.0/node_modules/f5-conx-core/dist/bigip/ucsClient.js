/* eslint-disable @typescript-eslint/no-unused-vars */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UcsClient = void 0;
const path_1 = __importDefault(require("path"));
const constants_1 = require("../constants");
/**
 * handles F5 UCS tasks for generating and downloading UCS files
 *  @param verion is used to adjust api end-points for different versions
 *  @param mgmtclient provides necessary connectivity details
 */
class UcsClient {
    // /**
    //  * main ucs url - used for listing ucs on device
    //  */
    // ucsUrl = '/mgmt/tm/sys/ucs'
    // /**
    //  * the tasks path url seems to be the original async method
    //  */
    // taskUcsUrl = '/mgmt/tm/task/sys/ucs'
    // /**
    //  * the shared path url seems to be the latest method
    //  *  - also supports "no-private-keys" option
    //  */
    // sharedUcsUrl = '/mgmt/tm/shared/sys/backup'
    constructor(mgmtClient) {
        this._mgmtClient = mgmtClient;
    }
    // tmsh save sys ucs /var/tmp/backup_${HOSTNAME}_`date +%Y%m%d-%H%M%S`.ucs
    // K13132: Backing up and restoring BIG-IP configuration files with a UCS archive
    // https://support.f5.com/csp/article/K13132
    // tmsh save sys ucs $(echo $HOSTNAME | cut -d'.' -f1)-$(date +%H%M-%m%d%y)
    //  https://github.com/F5Networks/f5-ansible/blob/devel/ansible_collections/f5networks/f5_modules/plugins/modules/bigip_ucs_fetch.py
    // /mgmt/tm/sys/ucs/1606307886548143
    // /mgmt/tm/shared/sys/backup/example
    // /mgmt/tm/shared/sys/backup/a5e23ab2-cfc3-4f69-966e-30aeb237b5a8
    /**
     * generate and download ucs file
     *  - should include all parameters for creating ucs
     * @param options.fileName name of ucs to create (do not include .ucs)
     * @param options.localDestPathFile
     * @param options.passPhrase to encrypt ucs with
     * @param options.noPrivateKey exclude SSL private keys from regular ucs
     * @param options.mini create mini_ucs for corkscrew
     */
    get(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const createResp = yield this.create(options);
            const dest = (options === null || options === void 0 ? void 0 : options.localDestPathFile) ?
                options.localDestPathFile : createResp.data.file;
            const downloadResp = yield this.download(createResp.data.file, dest);
            return downloadResp;
        });
    }
    /**
     *
     * @param localDestPathFile
     * @param options.fileName
     * @param options.passPhrase to encrypt ucs with
     * @param options.noPrivateKey exclude SSL private keys from regular ucs
     * @param options.mini create mini_ucs for corkscrew
     */
    create(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let file = (options === null || options === void 0 ? void 0 : options.fileName) ?
                options.fileName : yield this._mgmtClient.getFileName();
            this._mgmtClient.events.emit('log-debug', {
                message: 'ucs create function',
                options,
                file,
            });
            if (options === null || options === void 0 ? void 0 : options.mini) {
                const fileN = `${file}.mini_ucs.tar.gz`;
                // build mini ucs
                // https://unix.stackexchange.com/questions/167717/tar-a-list-of-files-which-dont-all-exist
                const ucsCmd = [
                    'tar',
                    '-czf',
                    `${constants_1.F5DownloadPaths.ucs.path}${fileN}`,
                    '-C',
                    '/',
                    'config/bigip.conf',
                    'config/bigip_gtm.conf',
                    'config/bigip_base.conf',
                    'config/bigip_user.conf',
                    'config/bigip_script.conf',
                    'config/profile_base.conf',
                    'config/low_profile_base.conf',
                    'config/user_alert.conf',
                    'config/bigip.license',
                    'config/partitions',
                    '/config/filestore/files_d'
                ];
                // /**
                //  * sometime, not all the files are there, so it will toss errors, but still create the tar with the files it does find
                //  * Example:  "commandResult":"tar: config/bigip_gtm.conf: Cannot stat: No such file or directory\ntar: config/bigip_script.conf: Cannot stat: No such file or directory\ntar: config/bigip.license: Cannot stat: No such file or directory\ntar: Exiting with failure status due to previous errors\n"
                //  */
                this._mgmtClient.events.emit('log-debug', 'creating mini_ucs');
                // run the main bash command to make the mini_ucs
                return yield this._mgmtClient.makeRequest(constants_1.iControlEndpoints.bash, {
                    method: 'POST',
                    data: {
                        command: 'run',
                        utilCmdArgs: `-c '${ucsCmd.join(' ')}'`
                    }
                })
                    .then((resp) => __awaiter(this, void 0, void 0, function* () {
                    // todo: create a log statement saying, "The previous bash call could have tossed some errors about files missing, however, the tar/ucs should have still been created with the files that were present"
                    this._mgmtClient.events.emit('log-debug', 'confirming mini_ucs has been created');
                    // run another bash command to ls ucs directory
                    //  this is just double checking everything worked as expected
                    return yield this._mgmtClient.makeRequest(constants_1.iControlEndpoints.bash, {
                        method: 'POST',
                        data: {
                            command: 'run',
                            utilCmdArgs: `-c 'ls ${constants_1.F5DownloadPaths.ucs.path}'`
                        }
                    })
                        .then(check => {
                        if (check.data.commandResult.includes(fileN)) {
                            // if file creation api worked and ls of /var/local/ucs api worked
                            //  and we made sure the file we expect is in the directory...
                            // inject file name into response so downstream functions can use it
                            resp.data.file = fileN;
                            // inject confirmation data - this is just for fyi
                            resp.data.ls = check.data.commandResult;
                            this._mgmtClient.events.emit('log-debug', {
                                message: 'mini_ucs creationg confirmed',
                                data: resp.data
                            });
                            return resp;
                        }
                        else {
                            // this is a corner case that I have not experienced, but figured was valid
                            const msg = 'mini_ucs api calls were successful, but the mini_ucs was not created.  Please check the logs for possible failure reasons';
                            this._mgmtClient.events.emit('log-error', msg);
                            Promise.reject(msg);
                        }
                    });
                }));
            }
            else {
                // add ucs file suffix if not there
                file =
                    file.endsWith('.ucs') ?
                        file : `${file}.ucs`;
                // build api call depending on options
                const postBody = {
                    // default regular backup params
                    action: 'BACKUP',
                    file,
                };
                // debugger;
                if ((options === null || options === void 0 ? void 0 : options.passPhrase) && (options === null || options === void 0 ? void 0 : options.noPrivateKeys)) {
                    postBody.action = 'BACKUP_WITH_NO_PRIVATE_KEYS_WITH_ENCRYPTION';
                    postBody.passphrase = options.passPhrase;
                }
                else if (options === null || options === void 0 ? void 0 : options.passPhrase) {
                    postBody.action = 'BACKUP_WITH_ENCRYPTION';
                    postBody.passphrase = options.passPhrase;
                }
                else if (options === null || options === void 0 ? void 0 : options.noPrivateKeys) {
                    postBody.action = 'BACKUP_WITH_NO_PRIVATE_KEYS';
                }
                this._mgmtClient.events.emit('log-debug', {
                    message: 'creating ucs',
                    postBody
                });
                // create ucs
                return yield this._mgmtClient.makeRequest(constants_1.iControlEndpoints.sharedUcsBackup, {
                    method: 'POST',
                    data: postBody
                })
                    .then((resp) => __awaiter(this, void 0, void 0, function* () {
                    // this url is always async, so we don't check for 202
                    const asyncUrl = `${constants_1.iControlEndpoints.sharedUcsBackup}/${resp.data.id}`;
                    // return response back to createUcs
                    return yield this._mgmtClient.followAsync(asyncUrl);
                }));
                // debugger;
                // download ucs
                // const downloadedUcs = await this._mgmtClient.download(createUcs.data, )
            }
        });
    }
    /**
     * download ucs from f5
     *
     * @param fileName file name of ucs on bigip
     * @param localDestPathFile where to put the file (including file name)
     */
    download(fileName, localDestPathFile) {
        return __awaiter(this, void 0, void 0, function* () {
            // if we only got a local path (no filename with file type suffix ".ext")
            //  then append created file name
            if (!localDestPathFile.includes('.')) {
                this._mgmtClient.events.emit('log-debug', 'ucs download, specified destination is path, appending file name');
                localDestPathFile = path_1.default.join(localDestPathFile, fileName);
            }
            // this._mgmtClient.events.emit('log-debug', 'ucs download, specified destination is path, appending file name');
            return yield this._mgmtClient.download(fileName, localDestPathFile, 'UCS');
        });
    }
    /**
     * list ucs files on f5
     */
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            // this will check the folder every time
            return yield this._mgmtClient.makeRequest(constants_1.iControlEndpoints.ucs);
        });
    }
    /**
     * delete ucs file on f5
     * @param archive_name.ucs
     */
    delete(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._mgmtClient.makeRequest(`${constants_1.iControlEndpoints.ucs}/${name}`, {
                method: 'DELETE'
            });
        });
    }
}
exports.UcsClient = UcsClient;
/**
 * example output from /mgmt/tm/shared/sys/backup/example
 */
const example = {
    "items": [
        {
            "file": "example string",
            "passphrase": "example string",
            "action": "BACKUP",
            "id": "88f02992-a8fd-40e8-a018-37f2e21f9361",
            "status": "CREATED",
            "startTime": "2020-11-26T03:58:01.389-0800",
            "endTime": "2020-11-26T03:58:01.389-0800",
            "name": "example string",
            "description": "example string",
            "errorMessage": "example string",
            "progress": "example string",
            "numericProgress": 1.7976931348623157e+308,
            "taskWorkerReference": {
                "link": "http://host:port/path/to/resource",
                "isSubcollection": false
            },
            "userReference": {
                "link": "http://host:port/path/to/resource",
                "isSubcollection": false
            },
            "identityReferences": [
                {
                    "link": "http://host:port/path/to/resource",
                    "isSubcollection": false
                },
                {
                    "link": "http://host:port/path/to/resource",
                    "isSubcollection": false
                }
            ],
            "ownerMachineId": "88f02992-a8fd-40e8-a018-37f2e21f9361",
            "taskWorkerGeneration": 9223372036854776000,
            "validateOnly": false,
            "generation": 9223372036854776000,
            "lastUpdateMicros": 9223372036854776000,
            "expirationMicros": 9223372036854776000,
            "kind": "tm:shared:sys:backup:ucsbackuptaskitemstate",
            "selfLink": "https://localhost/mgmt/tm/shared/sys/backup/example/item",
            "actionEnumValues": [
                "BACKUP",
                "RESTORE",
                "RESTORE_WITH_NO_LICENSE",
                "BACKUP_WITH_NO_PRIVATE_KEYS",
                "BACKUP_WITH_ENCRYPTION",
                "BACKUP_WITH_NO_PRIVATE_KEYS_WITH_ENCRYPTION",
                "RESTORE_WITH_ENCRYPTION",
                "RESTORE_WITH_NO_LICENSE_WITH_ENCRYPTION",
                "CLEANUP"
            ],
            "statusEnumValues": [
                "CREATED",
                "STARTED",
                "CANCEL_REQUESTED",
                "CANCELED",
                "FAILED",
                "FINISHED"
            ]
        }
    ],
    "description": {
        "propertyDocumentationComments": {},
        "fieldTypeMap": {},
        "indexStorageMap": {},
        "indexAllContentExclusionMap": [
            "id"
        ],
        "primaryKeyPropertyName": "id",
        "naturalKeyPropertyNames": [],
        "expandAllWithKeysPropertyNames": [],
        "generation": 0,
        "lastUpdateMicros": 0
    },
    "generation": 0,
    "lastUpdateMicros": 0,
    "kind": "tm:shared:sys:backup:ucsbackuptaskcollectionstate",
    "selfLink": "https://localhost/mgmt/tm/shared/sys/backup/example"
};
//# sourceMappingURL=ucsClient.js.map