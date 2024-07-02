# Welcome to f5-conx-core

f5-conx-core is a project to abstract all the API functionality developed for the vscode-f5 extension to be used in other projects.

This project is based on JavaScript, but written in TypeScript and utilizes JSdoc to provide built in documentation of functionality, inputs, and outputs.

Goals/features:

* standardize all F5 HTTP REST calls
  * auth token/provider management
  * standard async/job monitoring
  * provide connection timing information for analytics/telemtry
  * file upload/download functionality
  * tmos meta data and ATC service discovery/mgmt
  * ATC version mgmt (from github)
  * ATC RPM install/uninstall
  * ATC usage (fast/as3/do/ts/cf)
  * UCS/QKVIEW management
* standardize all external HTTP rest calls
  * custom user-agent to identify calls made with this project
  * file downloads
  * internet proxy support (pending)
* IPv6 support (pending confirmation)
* standard file cache location
* standard logging functionality

---

## Architecture

### http-timer for axios requests

<https://github.com/szmarczak/http-timer>

The above plugin adds the following timings object to the response of axios

```typescript
export interface Timings {
    start: number;
    socket?: number;
    lookup?: number;
    connect?: number;
    secureConnect?: number;
    upload?: number;
    response?: number;
    end?: number;
    error?: number;
    abort?: number;
    phases: {
        wait?: number;
        dns?: number;
        tcp?: number;
        tls?: number;
        request?: number;
        firstByte?: number;
        download?: number;
        total?: number;
    };
}
```

### simplified HTTP Response type including the timings

```typescript
export type HttpResponse = {
    data?: unknown;
    headers?: unknown;
    status: number;
    statusText?: string;
    request?: {
        url: string;
        method: string;
        headers: unknown;
        protocol: string;
        timings: Timings;
        data?: unknown;
    };
};
```

Using these timings we can log and provide stats about what devices (mainly f5) are responding slower than others or a gathered base line (telemetry/analytics)

---

## Usage

**Add details about how to use the project**

## Contributor Documentation

A collection of helpful commands have been added to the package manager (npm) scripts directive. Check out the `package.json` for an up-to-date list of commands.

* Build Package (Typescript -> Javascript): `npm run build-package`
* Build Code Documentation: `npm run build-code-docs`
* Run Unit Tests: `npm run test`
* Run Linter: `npm run lint`

Note that the `main` and `types` package manager directive are pointed at the `dist` folder (where `tsc` builds the package). Please ensure any published packages builds and includes that folder.

## Source Repository

See the source repository [here](https://github.com/------------).

## Filing Issues and Getting Help

Please don't hesitate to open an issue to ask for a feature, submit a bug, or expand documentation.  This project is here to help others and hopefully prevent duplicate work

the following to be updated when the repo transitions to devcentral

```text
## Copyright

Copyright 2014-2020 F5 Networks Inc.

### F5 Networks Contributor License Agreement

Before you start contributing to any project sponsored by F5 Networks, Inc. (F5) on GitHub, you will need to sign a Contributor License Agreement (CLA).  

If you are signing as an individual, we recommend that you talk to your employer (if applicable) before signing the CLA since some employment agreements may have restrictions on your contributions to other projects. Otherwise by submitting a CLA you represent that you are legally entitled to grant the licenses recited therein.  

If your employer has rights to intellectual property that you create, such as your contributions, you represent that you have received permission to make contributions on behalf of that employer, that your employer has waived such rights for your contributions, or that your employer has executed a separate CLA with F5.

If you are signing on behalf of a company, you represent that you are legally entitled to grant the license recited therein. You represent further that each employee of the entity that submits contributions is authorized to submit such contributions on behalf of the entity pursuant to the CLA.
```