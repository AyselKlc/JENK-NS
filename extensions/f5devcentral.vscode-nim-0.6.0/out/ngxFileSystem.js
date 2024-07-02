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
exports.NgxFsProvider = exports.FsProvider = exports.Directory = exports.File = void 0;
const vscode_1 = require("vscode");
const path_1 = __importDefault(require("path"));
class File {
    constructor(name) {
        this.type = vscode_1.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}
exports.File = File;
class Directory {
    constructor(name) {
        this.type = vscode_1.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}
exports.Directory = Directory;
class FsProvider {
    constructor() {
        this.root = new Directory('');
        // --- manage file events
        this._emitter = new vscode_1.EventEmitter();
        this._bufferedEvents = [];
        this.onDidChangeFile = this._emitter.event;
    }
    // --- manage file metadata
    stat(uri) {
        return this.lookup(uri, false);
    }
    readDirectory(uri) {
        const entry = this._lookupAsDirectory(uri, false);
        const result = [];
        for (const [name, child] of entry.entries) {
            result.push([name, child.type]);
        }
        return result;
    }
    // --- manage file contents
    readFile(uri) {
        const data = this._lookupAsFile(uri, false).data;
        if (data) {
            return data;
        }
        throw vscode_1.FileSystemError.FileNotFound();
    }
    /**
     * native write/create file
     *  - allows create/overwrite
     *  - directories must exist
     * @param uri
     * @param content
     * @param options
     */
    writeFile(uri, content, options) {
        const basename = path_1.default.posix.basename(uri.path);
        const parent = this.lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode_1.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode_1.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this.fireSoon({ type: vscode_1.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;
        this.fireSoon({ type: vscode_1.FileChangeType.Changed, uri });
        // function to post updated doc back to nim
        const stat = this.stat(uri);
        vscode_1.commands.executeCommand('nginx.postConfigFile', { uri, stat });
    }
    // --- manage files/folders
    rename(oldUri, newUri, options) {
        if (!options.overwrite && this.lookup(newUri, true)) {
            throw vscode_1.FileSystemError.FileExists(newUri);
        }
        const entry = this.lookup(oldUri, false);
        const oldParent = this.lookupParentDirectory(oldUri);
        const newParent = this.lookupParentDirectory(newUri);
        const newName = path_1.default.posix.basename(newUri.path);
        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);
        this.fireSoon({ type: vscode_1.FileChangeType.Deleted, uri: oldUri }, { type: vscode_1.FileChangeType.Created, uri: newUri });
    }
    delete(uri) {
        const dirname = uri.with({ path: path_1.default.posix.dirname(uri.path) });
        const basename = path_1.default.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename)) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;
        this.fireSoon({ type: vscode_1.FileChangeType.Changed, uri: dirname }, { uri, type: vscode_1.FileChangeType.Deleted });
    }
    createDirectory(uri) {
        const basename = path_1.default.posix.basename(uri.path);
        const dirname = uri.with({ path: path_1.default.posix.dirname(uri.path) });
        const parent = this._lookupAsDirectory(dirname, false);
        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this.fireSoon({ type: vscode_1.FileChangeType.Changed, uri: dirname }, { type: vscode_1.FileChangeType.Created, uri });
    }
    lookup(uri, silent) {
        const parts = uri.path.split('/');
        let entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode_1.FileSystemError.FileNotFound(uri);
                }
                else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }
    _lookupAsDirectory(uri, silent) {
        const entry = this.lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw vscode_1.FileSystemError.FileNotADirectory(uri);
    }
    _lookupAsFile(uri, silent) {
        const entry = this.lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode_1.FileSystemError.FileIsADirectory(uri);
    }
    lookupParentDirectory(uri) {
        const dirname = uri.with({ path: path_1.default.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }
    watch(_resource) {
        // ignore, fires for all changes...
        return new vscode_1.Disposable(() => { });
    }
    fireSoon(...events) {
        this._bufferedEvents.push(...events);
        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }
        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
exports.FsProvider = FsProvider;
class NgxFsProvider extends FsProvider {
    /**
     * load/create file (will create necessary parent folders)
     *
     * **will always create/overwrite**
     *
     * @param uri
     * @param content
     * @param id
     */
    loadFile(uri, content, id) {
        const basename = path_1.default.posix.basename(uri.path);
        // set options defaults
        const options = {
            create: true,
            overwrite: true
        };
        // create dir path if not there
        this._makePath(uri);
        const parent = this.lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode_1.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode_1.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this.fireSoon({ type: vscode_1.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.id = id;
        entry.data = content;
        this.fireSoon({ type: vscode_1.FileChangeType.Changed, uri });
    }
    /**
     * make parent directires if not present
     */
    _makePath(uri) {
        // get the base directory
        const dirname = uri.with({ path: path_1.default.posix.dirname(uri.path) });
        //  console.log('makePath', dirname.path);
        // split the base directory to the folder parts
        const parts = dirname.path.split('/');
        // array to hold the parent folders as we create them
        const fullPath = [];
        // loop through folders
        for (const part of parts) {
            if (!part) {
                continue; // empty part, continue with loop
            }
            // track the folder path as we check/create them
            fullPath.push(part);
            // see if current folder exists
            const here = this.lookup(vscode_1.Uri.parse(path_1.default.join(...fullPath)), true);
            if (!here) {
                // current folder not found, so create it
                // console.log('creating dir', fullPath);
                this.createDirectory(vscode_1.Uri.parse(path_1.default.join(...fullPath)));
            }
            else {
                // console.log('directory exists already: ', fullPath);
            }
        }
    }
}
exports.NgxFsProvider = NgxFsProvider;
//# sourceMappingURL=ngxFileSystem.js.map