/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
 * See License in the project root for license information.
 * -------------------------------------------------------------------------------------------
 */

/**
 * @module LargeFileUploadTask
 */

import { Client } from "../index";
import { Range } from "../Range";

/**
 * @interface
 * Signature to represent the resulting response in the status enquiry request
 * @property {string} expirationDateTime - The expiration of the time of the upload session
 * @property {string[]} nextExpectedRanges - The ranges expected in next consecutive request in the upload
 */
interface UploadStatusResponse {
    expirationDateTime: string;
    nextExpectedRanges: string[];
}

/**
 * @interface
 * Signature to define options for upload task
 * @property {number} [rangeSize = LargeFileUploadTask.DEFAULT_FILE_SIZE] - Specifies the range chunk size
 */
export interface LargeFileUploadTaskOptions {
    rangeSize?: number;
};

/**
 * @interface
 * Signature to represent upload session resulting from the session creation in the server
 * @property {string} url - The URL to which the file upload is made
 * @property {Date} expiry - The expiration of the time of the upload session
 */
export interface LargeFileUploadSession {
    url: string;
    expiry: Date;
}

/**
 * @interface
 * Signature to define the properties and content of the file in upload task
 * @property {ArrayBuffer | File} content - The actual file content
 * @property {string} name - Specifies the file name with extension
 * @property {number} size - Specifies size of the file
 */
export interface FileObject {
    content: ArrayBuffer | File;
    name: string;
    size: number;
}

/**
 * @class
 * Class representing LargeFileUploadTask
 */
export class LargeFileUploadTask {

    /** 
     * @protected
     * The GraphClient instance
     */
    protected client: Client

    /**
     * @protected
     * The object holding file details 
     */
    protected file: FileObject

    /**
     * @protected
     * The object holding options for the task
     */
    protected options: LargeFileUploadTaskOptions

    /**
     * @protected
     * The object for upload session
     */
    protected uploadSession: LargeFileUploadSession

    /**
     * @protected
     * The next range needs to be uploaded
     */
    protected nextRange: Range

    /**
     * @private
    * Default value for the rangeSize
    */
    private DEFAULT_FILE_SIZE: number = 5 * 1024 * 1024;

    /**
     * @constructor
     * Constructs a LargeFileUploadTask
     * @param {Client} client - The GraphClient instance
     * @param {FileObject} file - The FileObject holding details of a file that needs to be uploaded
     * @param {LargeFileUploadSession} uploadSession - The upload session to which the upload has to be done
     * @param {LargeFileUploadTaskOptions} options - The upload task options
     * @returns An instance of LargeFileUploadTask
     */
    constructor(client: Client, file: FileObject, uploadSession: LargeFileUploadSession, options: LargeFileUploadTaskOptions) {
        let self = this;
        self.client = client;
        self.file = file;
        if (options.rangeSize === undefined) {
            options.rangeSize = self.DEFAULT_FILE_SIZE;
        }
        self.options = options;
        self.uploadSession = uploadSession;
        self.nextRange = new Range(0, self.options.rangeSize - 1);
    }

    /**
     * @public
     * Parses given range string to the Range instance
     * @param {string[]} ranges - The ranges value
     * @returns The range instance
     */
    public parseRange(ranges: string[]): Range {
        let rangeStr = ranges[0];
        if (typeof rangeStr === "undefined" || rangeStr === "") {
            return new Range();
        }
        let firstRange = rangeStr.split("-"),
            minVal = parseInt(firstRange[0]),
            maxVal = parseInt(firstRange[1]);
        if (Number.isNaN(maxVal)) {
            maxVal = this.file.size - 1;
        }
        return new Range(minVal, maxVal);
    }

    /**
     * @public
     * Updates the expiration date and the next range
     * @param {UploadStatusResponse} response - The response of the upload status
     * @returns Nothing
     */
    public updateTaskStatus(response: UploadStatusResponse): void {
        let self = this;
        self.uploadSession.expiry = new Date(response.expirationDateTime);
        self.nextRange = self.parseRange(response.nextExpectedRanges);
    }

    /**
     * @public
     * Gets next range that needs to be uploaded
     * @returns The range instance
     */
    public getNextRange(): Range {
        let self = this;
        if (self.nextRange.minValue === -1) {
            return self.nextRange;
        }
        let minVal = self.nextRange.minValue,
            maxValue = minVal + self.options.rangeSize - 1;
        if (maxValue >= self.file.size) {
            maxValue = self.file.size - 1;
        }
        return new Range(minVal, maxValue);
    }

    /**
     * @public
     * Slices the file content to the given range
     * @param {Range} range - The range value
     * @returns The sliced ArrayBuffer or Blob
     */
    public sliceFile(range: Range): ArrayBuffer | Blob {
        let blob = this.file.content.slice(range.minValue, range.maxValue + 1);
        return blob;
    }

    /**
     * @public
     * @async
     * Uploads file to the server in a sequential order by slicing the file
     * @returns The promise resolves to uploaded response
     */
    public async upload(): Promise<any> {
        let self = this;
        try {
            while (true) {
                let nextRange = self.getNextRange();
                if (nextRange.maxValue === -1) {
                    let err = new Error("Task with which you are trying to upload is already completed, Please check for your uploaded file");
                    err.name = "Invalid Session";
                    throw err;
                }
                let fileSlice = self.sliceFile(nextRange),
                    response = await self.uploadSlice(fileSlice, nextRange, self.file.size);
                // Upon completion of upload process incase of onedrive, driveItem is returned, which contains id
                if (response.id !== undefined) {
                    return response;
                } else {
                    self.updateTaskStatus(response);
                }
            }
        } catch (err) {
            throw err;
        }
    }

    /**
     * @public
     * @async
     * Uploads given slice to the server
     * @param {ArrayBuffer | Blob | File} fileSlice - The file slice
     * @param {Range} range - The range value
     * @param {number} totalSize - The total size of a complete file
     */
    public async uploadSlice(fileSlice: ArrayBuffer | Blob | File, range: Range, totalSize: number): Promise<any> {
        let self = this;
        try {
            return await self.client
                .api(self.uploadSession.url)
                .headers({
                    "Content-Length": `${range.maxValue - range.minValue + 1}`,
                    "Content-Range": `bytes ${range.minValue}-${range.maxValue}/${totalSize}`
                })
                .put(fileSlice);
        } catch (err) {
            throw err;
        }
    }

    /**
     * @public
     * @async
     * Deletes upload session in the server
     * @returns The promise resolves to cancelled response
     */
    public async cancel(): Promise<any> {
        let self = this;
        try {
            return await self.client
                .api(self.uploadSession.url)
                .delete();
        } catch (err) {
            throw err;
        }
    }

    /**
     * @public
     * @async
     * Gets status for the upload session
     * @returns The promise resolves to the status enquiry response
     */
    public async getStatus(): Promise<any> {
        let self = this;
        try {
            let response = await self.client
                .api(self.uploadSession.url)
                .get();
            self.updateTaskStatus(response);
            return response;
        } catch (err) {
            throw err;
        }
    }

    /**
     * @public
     * @async
     * Resumes upload session and continue uploading the file from the last sent range
     * @returns The promise resolves to the uploaded response
     */
    public async resume(): Promise<any> {
        let self = this;
        try {
            await self.getStatus();
            return await self.upload();
        } catch (err) {
            throw err;
        }
    }
}
