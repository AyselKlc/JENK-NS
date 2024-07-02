/*
 * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
 * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
 * may copy and modify this software product for its internal business purposes.
 * Further, Licensee may upload, publish and distribute the modified version of
 * the software product on devcentral.f5.com.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.F5UploadPaths = exports.F5DownloadPaths = exports.atcMetaData = exports.iControlEndpoints = exports.atcMetaDataCloudUrl = exports.TMP_DIR = void 0;
/**
 * global file cache directory for:
 *  - TMOS IOS (+ signature files)
 *  - ATC ILX RPMs (+ signature files)
 *  - ATC releases information/metadata
 *  - ...
 */
exports.TMP_DIR = '/f5_cache';
/**
 * url for ATC metadata in the cloud, this is only used by f5-sdk-js and only here for reference
 */
exports.atcMetaDataCloudUrl = 'https://cdn.f5.com/product/cloudsolutions/f5-extension-metadata/latest/metadata.json';
/**
 * Common iControl/tmos api endpoints
 */
exports.iControlEndpoints = {
    login: '/mgmt/shared/authn/login',
    bash: '/mgmt/tm/util/bash',
    tmosInfo: '/mgmt/shared/identified-devices/config/device-info',
    backup: '/mgmt/tm/shared/sys/backup',
    ucs: '/mgmt/tm/sys/ucs',
    ucsTasks: '/mgmt/tm/task/sys/ucs',
    sharedUcsBackup: '/mgmt/tm/shared/sys/backup',
    qkview: '/mgmt/cm/autodeploy/qkview',
    atcPackageMgmt: '/mgmt/shared/iapp/package-management-tasks'
};
/**
 * NEW atc metadata for endpoints, download and web urls
 */
exports.atcMetaData = {
    fast: {
        endPoints: {
            declare: '/mgmt/shared/fast/applications',
            templateSets: '/mgmt/shared/fast/templatesets',
            templates: '/mgmt/shared/fast/templates',
            tasks: '/mgmt/shared/fast/tasks',
            info: '/mgmt/shared/fast/info'
        },
        gitReleases: 'https://api.github.com/repos/F5Networks/f5-appsvcs-templates/releases',
        repo: 'https://github.com/F5Networks/f5-appsvcs-templates'
    },
    as3: {
        endPoints: {
            declare: '/mgmt/shared/appsvcs/declare',
            tasks: '/mgmt/shared/appsvcs/task',
            info: '/mgmt/shared/appsvcs/info'
        },
        gitReleases: 'https://api.github.com/repos/F5Networks/f5-appsvcs-extension/releases',
        repo: 'https://github.com/F5Networks/f5-appsvcs-extension'
    },
    do: {
        endPoints: {
            declare: '/mgmt/shared/declarative-onboarding',
            info: '/mgmt/shared/declarative-onboarding/info',
            inspect: '/mgmt/shared/declarative-onboarding/inspect'
        },
        gitReleases: 'https://api.github.com/repos/F5Networks/f5-declarative-onboarding/releases',
        repo: 'https://github.com/F5Networks/f5-declarative-onboarding'
    },
    ts: {
        endPoints: {
            declare: '/mgmt/shared/telemetry/declare',
            info: '/mgmt/shared/telemetry/info',
        },
        gitReleases: 'https://api.github.com/repos/F5Networks/f5-telemetry-streaming/releases',
        repo: 'https://github.com/F5Networks/f5-telemetry-streaming/'
    },
    cf: {
        endPoints: {
            declare: '/mgmt/shared/cloud-failover/declare',
            info: '/mgmt/shared/cloud-failover/info',
            inspect: '/mgmt/shared/cloud-failover/inspect',
            trigger: '/mgmt/shared/cloud-failover/trigger',
            reset: '/mgmt/shared/cloud-failover/reset'
        },
        gitReleases: 'https://api.github.com/repos/F5Networks/f5-cloud-failover-extension/releases',
        repo: 'https://github.com/F5Networks/f5-cloud-failover-extension/'
    }
};
/**
 * f5 download paths and uri's
 */
exports.F5DownloadPaths = {
    ucs: {
        uri: '/mgmt/shared/file-transfer/ucs-downloads',
        path: '/var/local/ucs/'
    },
    qkview: {
        uri: '/mgmt/cm/autodeploy/qkview-downloads',
        path: '/var/tmp/'
    },
    iso: {
        uri: '/mgmt/cm/autodeploy/software-image-downloads',
        path: '/shared/images/'
    }
};
/**
 * f5 upload paths and uri's
 */
exports.F5UploadPaths = {
    iso: {
        uri: '/mgmt/cm/autodeploy/software-image-uploads',
        path: '/shared/images'
    },
    file: {
        uri: '/mgmt/shared/file-transfer/uploads',
        path: '/var/config/rest/downloads'
    },
    ucs: {
        uri: '/mgmt/shared/file-transfer/ucs-uploads',
        path: '/var/local/ucs'
    }
};
//# sourceMappingURL=constants.js.map