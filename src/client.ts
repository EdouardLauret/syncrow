/// <reference path="../typings/main.d.ts" />

import fs = require('fs');
import net = require('net');
import Messenger= require('./messenger');
import FileContainer = require("./file_container");
import Logger = require('./helpers/logger');
import EventsHelper from "./helpers/events_helper";
import async from "async";
import Configuration = require('./configuration');
import TransferActions = require("./syncrow_server/transfer_actions");

let logger = Logger.getNewLogger('Client', Configuration.client.logLevel);
const debug = require('debug')('client');

import errorPrinter = require('./utils/error_printer');

//TODO add support syncing after reestablishing connection
//TODO add support for deleting offline
//TODO Strategies for offline loading
//TODO extract the common parts of client and server


class Client {
    otherParty:Messenger;
    fileContainer:FileContainer;
    filesToSync:Object;
    transferJobsQueue:async.AsyncQueue;

    static events = {
        fileSocket: 'fileSocket',
        getFile: 'getFile',
        getFileList: 'getFileList',
        pullFile: 'pullFile',
        getMeta: 'getMeta',
        metaData: 'metaData',
        createDirectory: 'createDirectory'
    };

    constructor(pathToWatch:string, otherParty:Messenger, socketsLimit = Configuration.client.socketsLimit) {
        this.filesToSync = {};
        this.fileContainer = this.createDirectoryWatcher(pathToWatch);
        this.otherParty = this.addOtherPartyMessenger(otherParty);
        this.transferJobsQueue = async.queue((job:Function, callback:Function)=>job(callback), socketsLimit);
    }

    /**
     * @param socketMessenger
     * @returns {Messenger}
     */
    public addOtherPartyMessenger(socketMessenger:Messenger) {
        socketMessenger.on(Messenger.events.message, (message:string)=>this.routeEvent(this.otherParty, message));

        socketMessenger.on(Messenger.events.connected, ()=> {
            logger.info('connected with other party beginning to sync');
            this.fileContainer.recomputeMetaDataForDirectory();
        });

        socketMessenger.on(Messenger.events.disconnected, ()=>logger.info('disconnected, waiting for reconnection'));
        return socketMessenger;
    }

    private routeEvent(otherParty:Messenger, message:string) {
        let event = EventsHelper.parseEvent(otherParty, message);
        if (!event) return;

        debug(`Client - received a ${event.type} event: ${JSON.stringify(event.body)}`);

        if (event.type === Client.events.pullFile) {
            this.addPushFileJobToQueue(event.body.name, event.body.address);

        } else if (event.type === Client.events.metaData) {
            this.addSyncMetaDataFromOtherParty(event.body);

        } else if (event.type === Client.events.getMeta) {
            this.fileContainer.recomputeMetaDataForDirectory();

        } else if (event.type === FileContainer.events.created || event.type === FileContainer.events.changed) {
            this.addPullFileJobToQueue(event.body.name);

        } else if (event.type === FileContainer.events.createdDirectory) {
            this.fileContainer.createDirectory(event.body);

        } else if (event.type === FileContainer.events.deleted) {
            this.fileContainer.deleteFile(event.body);

        } else if (event.type === EventsHelper.events.error) {
            console.info(`received error message ${JSON.stringify(event.body)}`);

        } else {
            EventsHelper.writeEventToOtherParty(otherParty, EventsHelper.events.error, `unknown event type: ${event.type}`);
        }
    }

    private createDirectoryWatcher(directoryToWatch:string):FileContainer {
        var fileContainer = new FileContainer(directoryToWatch);

        [FileContainer.events.changed, FileContainer.events.deleted, FileContainer.events.created, FileContainer.events.createdDirectory]
            .forEach((eventName)=> {
                fileContainer.on(eventName, (eventContent:any)=> {
                    debug(`got event: ${eventName} from filecontainer`);
                    EventsHelper.writeEventToOtherParty(this.otherParty, eventName, eventContent);
                });
            });

        //TODO remove
        fileContainer.on(FileContainer.events.metaComputed, (metaData)=> {
            this.addSyncMetaDataFromOwnContainer(metaData);
            EventsHelper.writeEventToOtherParty(this.otherParty, Client.events.metaData, metaData);
        });

        fileContainer.getListOfTrackedFilesAndBeginWatching();

        return fileContainer;
    }

    private addPushFileJobToQueue(fileName:string, address:{port:number, host:string}) {
        const pushJob = (pushingDoneCallback) => {

            const pushStamp = `pushing ${fileName}`;
            console.time(pushStamp);

            TransferActions.pushFileToAddress(fileName, address, this.fileContainer, (err)=> {
                errorPrinter(err);
                console.timeEnd(pushStamp);

                pushingDoneCallback()
            });
        };

        this.transferJobsQueue.push(pushJob);
    }

    private addPullFileJobToQueue(fileName:string) {
        const pullJob = (pullingDoneCallback)=> {

            const pullStamp = `client: pulling file: ${fileName}`;
            console.time(pullStamp);

            TransferActions.pullFileFromParty(this.otherParty, fileName, this.otherParty.getOwnHost(), this.fileContainer, (err)=> {
                errorPrinter(err);
                console.timeEnd(pullStamp);

                pullingDoneCallback()
            });

        };

        this.transferJobsQueue.push(pullJob);
    }

    //TODO separate into strategy file
    private addSyncMetaDataFromOtherParty(syncData:{hashCode:string, modified:Date, name:string}):void {
        if (this.filesToSync[syncData.name]) {
            this.compareSyncMetaData(this.filesToSync[syncData.name], syncData);
            delete this.filesToSync[syncData.name];
            return;

        } else if (syncData.hashCode === FileContainer.directoryHashConstant && !this.fileContainer.isFileInContainer(syncData.name)) {
            return this.fileContainer.createDirectory(syncData.name);

        } else if (!this.fileContainer.isFileInContainer(syncData.name)) {
            return EventsHelper.writeEventToOtherParty(this.otherParty, Client.events.getFile, syncData.name);
        }
    }

    private addSyncMetaDataFromOwnContainer(syncData:{hashCode:string, modified:Date, name:string}) {
        if (this.filesToSync[syncData.name]) {
            this.compareSyncMetaData(syncData, this.filesToSync[syncData.name]);
            delete this.filesToSync[syncData.name];
        }
    }

    private compareSyncMetaData(ownMeta:{hashCode:string, modified:Date, name:string}, otherPartyMeta:{hashCode:string, modified:Date, name:string}) {
        Client.checkMetaDataFileIsTheSame(ownMeta, otherPartyMeta);
        if (otherPartyMeta.hashCode !== ownMeta.hashCode && ownMeta.hashCode) {
            if (otherPartyMeta.modified.getTime() > ownMeta.modified.getTime()) {
                return EventsHelper.writeEventToOtherParty(this.otherParty, Client.events.getFile, ownMeta.name);
            }
        }
    }

    private static checkMetaDataFileIsTheSame(ownMeta:{hashCode:string; modified:Date; name:string}, otherPartyMeta:{hashCode:string; modified:Date; name:string}) {
        if (ownMeta.name !== otherPartyMeta.name) {
            throw new Error('comparing not matching metadata')
        }
    }
}

export  = Client;