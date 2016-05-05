/// <reference path="../typings/main.d.ts" />

import fs = require('fs');
import events = require('events');
import async = require('async');
import crypto = require('crypto');
import path = require('path');
import readTree = require('./helpers/read_tree');
import rimraf = require('rimraf');
import mkdirp = require('mkdirp');
import ReadableStream = NodeJS.ReadableStream;
import {Stats} from "fs";
import Logger  = require('./helpers/logger');
import PathHelper = require('./helpers/path_helper');

let logger = Logger.getNewLogger('FileContainer');

// TODO add conflict resolving
// TOTO add reconnection manager
class FileContainer extends events.EventEmitter {
    static events = {
        changed: 'changed',
        deleted: 'deleted',
        created: 'created',
        createdDirectory: 'createdDirectory',
        metaComputed: 'metaComputed'
    };
    private directoryToWatch:string;
    private watchedFiles:Object;
    private blockedFiles:Object;
    static watchTimeout = 50;

    static directoryHashConstant = 'directory';
    processedFilesLimit = 50;

    constructor(directoryToWatch:string) {
        super();
        this.directoryToWatch = directoryToWatch;
        this.watchedFiles = {};
        this.blockedFiles = {};
    }

    public getListOfTrackedFilesAndBeginWatching() {
        var that = this;
        this.getFileTree((err, files)=> {
            files.forEach((file)=> {
                that.watchedFiles[file] = {};
            });
            that.beginWatching();
        });
    }

    public getListOfWatchedFiles():Array<string> {
        return Object.keys(this.watchedFiles);
    }

    private getFileTree(callback:(err, files?:Array<string>)=>void) {
        readTree(this.directoryToWatch, {}, (err, results:Array<string>)=> {
            if (err) return callback(err);

            callback(null, results.map(PathHelper.normalizePath))
        });
    }

    public recomputeMetaDataForDirectory() {
        var that = this;
        this.getFileTree((err, files)=> {
            async.eachLimit(files, that.processedFilesLimit, (file:string, callback)=>that.computeFileMetaDataAndEmit(file, callback))
        })
    }

    public isFileInContainer(file:string):boolean {
        return this.watchedFiles[file] !== undefined;
    }

    private computeFileMetaDataAndEmit(fileName:string, callback:(err?)=>void) {
        var that = this;
        async.parallel([(parallelCallback)=> {
            that.computeHashForFileOrReturnConstantValueForDirectory(fileName, parallelCallback);

        }, (parallelCallback)=> {
            that.getModifiedDateForFile(fileName, parallelCallback);

        }], (err:Error)=> {
            if (err) return logger.warn(`computeFileMetaDataAndEmit - got error: ${err}`);

            that.emit(FileContainer.events.metaComputed, this.getMetaDataForFile(fileName));
            callback();
        });
    }

    private computeHashForFile(fileName:string, callback:(err?)=>void) {
        logger.timeDebug(`computing hash for file ${fileName}`);
        var hash = crypto.createHash('sha256');
        fs.createReadStream(this.createAbsolutePath(fileName)).pipe(hash);

        hash.on('finish', ()=> {
            logger.timeEndDebug(`computing hash for file ${fileName}`);
            this.saveWatchedFileProperty(fileName, 'hashCode', hash.read().toString('hex'));
            callback();
        });
    }

    private computeHashForFileOrReturnConstantValueForDirectory(fileName:string, callback:(err?)=>any) {
        var that = this;
        fs.stat(this.createAbsolutePath(fileName), (err, stats:Stats)=> {
            if (err)return callback(err);

            if (stats.isDirectory()) {
                that.saveWatchedFileProperty(fileName, 'hashCode', FileContainer.directoryHashConstant);
                return callback();
            }

            that.computeHashForFile(fileName, callback);
        });
    }

    private getModifiedDateForFile(fileName:string, callback:(err?:Error)=>void) {
        fs.stat(this.createAbsolutePath(fileName), (error:Error, stats:fs.Stats)=> {
                if (error) return callback(error);

                this.saveWatchedFileProperty(fileName, 'modifiedDate', stats.mtime);
                callback();
            }
        )
    }

    private saveWatchedFileProperty(fileName:string, key:string, value:any) {
        if (!this.watchedFiles[fileName]) {
            this.watchedFiles[fileName] = {}
        }
        this.watchedFiles[fileName][key] = value;
    }

    private createAbsolutePath(file):string {
        return PathHelper.normalizePath(path.join(this.directoryToWatch, file));
    }

    private getMetaDataForFile(fileName:string):{hashCode:string, modified:Date, name:string} {
        return {
            modified: this.watchedFiles[fileName].modifiedDate,
            hashCode: this.watchedFiles[fileName].hashCode,
            name: fileName
        };
    }

    public deleteFile(fileName:string) {
        this.blockedFiles[fileName] = true;
        logger.info(`/deleteFile - deleting: ${fileName}`);

        rimraf(this.createAbsolutePath(fileName), (error)=> {
            if (error) return console.error(error);
            setTimeout(()=> {
                delete this.blockedFiles[fileName];
            }, FileContainer.watchTimeout);
        });
    }

    public consumeFileStream(fileName:string, readStream:ReadableStream) {
        try {
            var that = this;
            that.blockedFiles[fileName] = true;

            var writeStream = fs.createWriteStream(that.createAbsolutePath(fileName)).on('finish', ()=> {
                setTimeout(()=> {
                    delete that.blockedFiles[fileName];
                }, FileContainer.watchTimeout);
            });

            readStream.pipe(writeStream);

        } catch (error) {
            logger.warn(`/consumeFileStream - could not consume a fileStream, reason: ${error}`)
        }
    }

    public getReadStreamForFile(fileName:string):ReadableStream {
        try {
            return fs.createReadStream(this.createAbsolutePath(fileName));
        } catch (error) {
            logger.warn(`/getReadStreamForFile - could not open a read stream, reason: ${error}`);
        }
    }

    public createDirectory(fileName:string) {
        return mkdirp(this.createAbsolutePath(fileName), (error)=> {
            if (error) return logger.warn(`/createDirectory - could not create directory, reason: ${error}`);
        })
    }

    private beginWatching() {
        var that = this;
        fs.watch(this.directoryToWatch, {recursive: true}).on('change', (event, fileName)=> {
            if (event === 'rename') return that.checkRenameEventMeaning(PathHelper.normalizePath(fileName));

            return that.emitEventIfFileNotBlocked(FileContainer.events.changed, PathHelper.normalizePath(fileName));
        });
    }

    private checkRenameEventMeaning(fileName:string) {
        var that = this;

        fs.stat(that.createAbsolutePath(fileName), (error, stats:Stats)=> {
            if (error && that.watchedFiles[fileName]) {
                delete that.watchedFiles[fileName];
                return that.emitEventIfFileNotBlocked(FileContainer.events.deleted, fileName);

            } else if (error) {
                return logger.warn(`/checkRenameEventMeaning - deleted a non-tracked file, filename: ${fileName} reason: ${error}`);

            } else if (!that.watchedFiles[fileName] && stats.isDirectory()) {
                that.watchedFiles[fileName] = {};
                return that.emitEventIfFileNotBlocked(FileContainer.events.createdDirectory, fileName);

            } else if (!that.watchedFiles[fileName]) {
                that.watchedFiles[fileName] = {};
                return that.emitEventIfFileNotBlocked(FileContainer.events.created, fileName);
            }

            return that.emitEventIfFileNotBlocked(FileContainer.events.changed, fileName);
        })
    }

    private emitEventIfFileNotBlocked(event:string, fullFileName:string) {
        if (!this.blockedFiles[fullFileName]) {
            this.emit(event, fullFileName);
        }
    }
}

export = FileContainer;