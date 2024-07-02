// /*
//  * Copyright 2020. F5 Networks, Inc. See End User License Agreement ("EULA") for
//  * license terms. Notwithstanding anything to the contrary in the EULA, Licensee
//  * may copy and modify this software product for its internal business purposes.
//  * Further, Licensee may upload, publish and distribute the modified version of
//  * the software product on devcentral.f5.com.
//  */
// 'use strict';
// import path from 'path';
// import * as fs from 'fs';
// import https from 'https';
// import axios, { AxiosRequestConfig } from 'axios';
// import timer from '@szmarczak/http-timer/dist/source';
// import { F5HttpRequest, HttpResponse } from './httpModels'
// // import { rejects } from 'assert';
// // import logger from '../logger'
// /**
//  * Used to inject http call timers
//  * transport:request: httpsWithTimer
//  */
// const transport = {
//     request: function httpsWithTimer(...args: unknown[]): AxiosRequestConfig {
//         const request = https.request.apply(null, args)
//         timer(request);
//         return request;
//     }
// };
// /**
//  * Make generic HTTP request
//  * 
//  * @param host    host where request should be made
//  * @param uri     request uri
//  * @param options function options
//  * 
//  * @returns response data
//  */
// export async function makeRequest(options: F5HttpRequest): Promise<HttpResponse> {
//     let httpResponse;
//     //  have to keep adding the type definition for "transport" to axios when upgrading versions
//     //  it's allowed in the config (from a JS perspective), just missing in the types:
//     //  https://github.com/axios/axios/blob/master/lib/adapters/http.js#L163
//     //  https://github.com/axios/axios/issues/2853
//     const requestDefaults = {
//         httpsAgent: new https.Agent({
//             rejectUnauthorized: false
//         }),
//         transport
//     }
//     // merge incoming options into requestDefaults object
//     options = Object.assign(requestDefaults, options)
//     // logger.debug(`makeReqAXnew-REQUEST: ${options.method} -> ${options.baseURL}:${options}${options.url}`);
//     // wrapped in a try for debugging
//     // try {
//     // eslint-disable-next-line prefer-const
//     httpResponse = await axios(options)
//     // } catch (err) {
//     //     debugger;
//     // }
//     // check for unsuccessful request
//     // if (httpResponse.status > 300) {
//     //     return Promise.reject(new Error(
//     //         `HTTP request failed: ${httpResponse.status} ${JSON.stringify(httpResponse.data)}`
//     //     ));
//     // }
//     return httpResponse;
//     // return {
//     //     data: httpResponse.data,
//     //     headers: httpResponse.headers,
//     //     status: httpResponse.status,
//     //     statusText: httpResponse.statusText,
//     //     request: {
//     //         url: httpResponse.config.url,
//     //         method: httpResponse.request.method,
//     //         headers: httpResponse.request.headers,
//     //         protocol: httpResponse.config.httpsAgent.protocol,
//     //         timings: httpResponse.request.timings,
//     //     }
//     // };
// }
// export async function followAsyncCall(options: F5HttpRequest): Promise<HttpResponse> {
//     // run a while loop every x number of seconds to check the status of an async job
//     //
//     let i = 0;  // loop counter
//     let resp: HttpResponse;
//     // use taskId to control loop
//     while (i < 10) {
//         resp = await makeRequest(options);
//         // todo: break out the successful and failed results, only refresh statusBars on successful
//         if (resp.data.status === 'FINISHED' || resp.data.status === 'FAILED') {
//             // await new Promise(resolve => { setTimeout(resolve, 20000); }); // 20 seconds
//             return resp;
//         }
//         i++;
//         await new Promise(resolve => { setTimeout(resolve, 3000); }); // todo: update for global timer
//     }
//     // debugger;
//     return resp;
// }
// /**
//  * Download HTTP payload to file
//  *
//  * @param url  url
//  * @param file local file location where the downloaded contents should go
//  *
//  * @returns void
//  */
// export async function downloadToFile(localDestPath: string, options: F5HttpRequest): Promise<HttpResponse> {
//     const writable = fs.createWriteStream(localDestPath)
//     return new Promise(((resolve, reject) => {
//         this.makeRequest(options)
//             .then(function (response) {
//                 response.data.pipe(writable)
//                     // .on('finish', resolve)
//                 .on('finish', () => {
//                     // response.data.file = writable.path;
//                     // response.data.bytes = writable.bytesWritten;
//                     response.data = {
//                                 file: writable.path,
//                                 bytes: writable.bytesWritten
//                             };
//                     return resolve(response);
//                     // return resolve({
//                     //     data: {
//                     //         path: writable.path,
//                     //         bytes: writable.bytesWritten
//                     //     },
//                     //     headers: response.headers,
//                     //     status: response.status,
//                     //     statusText: response.statusText,
//                     //     request: {
//                     //         url: response.request.url,
//                     //         method: response.request.method,
//                     //         headers: response.request.headers,
//                     //         protocol: response.request.protocol,
//                     //         timings: response.request.timings
//                     //     }
//                     // })
//                 });
//             })
//             .catch(err => {
//                 // look at adding more failure details, like,
//                 // was it tcp, dns, dest url problem, write file problem, ...
//                 return reject(err)
//             })
//     }));
// }
// /**
//  * upload file to f5
//  *  - POST	/mgmt/shared/file-transfer/uploads/{file}
//  *  - path on f5 -> /var/config/rest/downloads
//  *
//  * @param file local file location to upload
//  * @param host
//  * @param port
//  * @param token
//  *
//  * @returns void
//  */
// export async function uploadFile(file: string, host: string, port: number, token: string): Promise<HttpResponse> {
//     let response;
//     const fileName = path.parse(file).base;
//     const fileStats = fs.statSync(file);
//     const chunkSize = 1024 * 1024;
//     let start = 0;
//     let end = Math.min(chunkSize, fileStats.size - 1);
//     while (end <= fileStats.size - 1 && start < end) {
//         try {
//             response = await this.makeRequest(
//                 {
//                     baseURL: `https://${host}:${port}`,
//                     url: `/mgmt/shared/file-transfer/uploads/${fileName}`,
//                     // port,
//                     method: 'POST',
//                     headers: {
//                         'X-F5-Auth-Token': token,
//                         'Content-Type': 'application/octet-stream',
//                         'Content-Range': `${start}-${end}/${fileStats.size}`,
//                         'Content-Length': end - start + 1
//                     },
//                     data: fs.createReadStream(file, { start, end }),
//                     contentType: 'raw'
//                 }
//             );
//         } catch (e) {
//             debugger;
//         }
//         start += chunkSize;
//         if (end + chunkSize < fileStats.size - 1) { // more to go
//             end += chunkSize;
//         } else if (end + chunkSize > fileStats.size - 1) { // last chunk
//             end = fileStats.size - 1;
//         } else { // done - could use do..while loop instead of this
//             end = fileStats.size;
//         }
//     }
//     response.data.fileName = fileName;
//     response.data.bytes = fileStats.size;
//     return response
//     // return {
//     //     data: {
//     //         fileName,
//     //         bytes: fileStats.size
//     //     },
//     //     headers: response.headers,
//     //     status: response.status,
//     //     statusText: response.statusText,
//     //     request: {
//     //         url: response.request.url,
//     //         method: response.request.method,
//     //         headers: response.request.headers,
//     //         protocol: response.request.protocol,
//     //         timings: response.request.timings
//     //     }
//     // }
// }
//# sourceMappingURL=f5Https.js.map