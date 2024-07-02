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
exports.QkviewClient = void 0;
const constants_1 = require("../constants");
class QkviewClient {
    constructor(mgmtClient) {
        this.mgmtClient = mgmtClient;
    }
    // /**
    //  * K04396542: Generating a QKView diagnostic file using the iControl REST API
    //  *  - https://support.f5.com/csp/article/K04396542
    //  */
    get(dest, name) {
        return __awaiter(this, void 0, void 0, function* () {
            // create, then download
            return yield this.create(name)
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                return yield this.download(resp.data.name, dest);
            }));
        });
    }
    /**
     *
     * @param name qkview name (must include .qkview)
     */
    create(name) {
        return __awaiter(this, void 0, void 0, function* () {
            // /mgmt/cm/autodeploy/qkview
            // possibly create a flow, like the mini_ucs, to allow for some customization via the bash endpoint.  See bottom of file for options.  Execute command over bash and watch the qkview list endpoint for completion?
            name
                = name
                    ? name
                    : `${yield this.mgmtClient.getFileName()}.qkview`;
            return yield this.mgmtClient.makeRequest(constants_1.iControlEndpoints.qkview, {
                method: 'POST',
                data: {
                    name
                }
            })
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                return yield this.mgmtClient.followAsync(`${constants_1.iControlEndpoints.qkview}/${resp.data.id}`);
            }));
        });
    }
    list() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(constants_1.iControlEndpoints.qkview);
        });
    }
    download(fileName, localPath) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.download(fileName, localPath, 'QKVIEW');
        });
    }
    /**
     * delete qkview by id on f5
     * @param id system qkview id
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.mgmtClient.makeRequest(`${constants_1.iControlEndpoints.qkview}/${id}`, {
                method: 'DELETE'
            });
        });
    }
}
exports.QkviewClient = QkviewClient;
// below is the command options for creating a qkview.  These can be used to additional creation options in the future
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const qkviewCmdHelp = `
[admin@bigip-tparty05:Active:Standalone] ~ # qkview -h
usage: qkview
 [ -f <output file name> ]
 [ -h print this message ]
 [ -r restrict to this blade only ]
 [ -o <asm_option> ]
 [ -O capture obfuscation rules ]
 [ -s <max file size> range:0-
 [ -p <path of modules>104857600 Bytes ]
 [ -t <module timeout in seconds>]
 [ -c collect complete information]
 [ -C exclude core files from output]
 [ --exclude <flag> to exclude log files from output]
        flag hex values are: (note: combine using bitwise OR)
                 1 = /var/log/audit
                 1 = /var/log/auditd
                 1 = /var/log/audit.d
                 1 = /var/log/restjavad-audit.0.log
                 1 = /var/log/restjavad-audit.0.log.lck
                 2 = /var/log/secure
                 4 = /root/.bash_history
                 4 = /root/.tmsh-history-root
               Name flags can be used instead of hex values:
                 all = --exclude=all (equivalent to 0xFFFFFFFF)
                 audit = --exclude=audit files (equivalent to 0x1)
                 secure = --exclude=secure files (equivalent to 0x2)
                 bash_history = --exclude=bash_history (equivalent to 4)
                 audit,secure = --exclude='audit secure' (equivalent to 3)

 [ -o The options are:
         [no-]asm-request-log    Include/exclude ASM request log data (default: not included) ]

 [ -v display verbose output]
 [ --progress-bar to show text-based progress bar, negates -v]
 Note: filenames provided with the -f option
       will be prepended with /var/tmp/ unless
       they already begin with /var/tmp/.
`;
//# sourceMappingURL=qkviewClient.js.map