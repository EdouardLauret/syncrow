import {loggerFor, debugFor} from "../utils/logger";
import {FileContainer} from "../fs_helpers/file_container";
import {SyncData, SyncAction, SyncActionSubject, SyncActionParams} from "../sync/sync_actions";
import {CallbackHelper} from "../connection/callback_helper";
import {TransferHelper} from "../transport/transfer_helper";
import {EventMessenger} from "../connection/event_messenger";
import {Closable} from "../utils/interfaces";
import {EventEmitter} from "events";
import {noAction} from "../sync/no_action";

const debug = debugFor("syncrow:engine");
const logger = loggerFor('Engine');

const INITIAL_TIMEOUT = 10;

export interface EngineOptions {
    sync:SyncAction;
}

export class Engine extends EventEmitter implements SyncActionSubject, Closable {
    //TODO add newFile support
    static events = {
        error: 'error',
        newFile: 'newFile',
        changedFile: 'changedFile',
        deletedPath: 'deletedPath',
        synced: 'synced',
        shutdown: 'shutdown',
        newDirectory: 'newDirectory'
    };

    static messages = {
        fileChanged: 'fileChanged',
        fileCreated: 'fileCreated',
        fileDeleted: 'fileDeleted',
        directoryCreated: 'directoryCreated',

        getFileList: 'getFileList',
        getMetaForFile: 'getMetaForFile'
    };

    private otherParties:Array<EventMessenger>;
    private callbackHelper:CallbackHelper;


    constructor(private fileContainer:FileContainer, private transferHelper:TransferHelper, private options:EngineOptions) {
        super();

        this.options.sync = this.options.sync ? this.options.sync : noAction;

        this.callbackHelper = new CallbackHelper();
        this.otherParties = [];
        this.addListenersToFileContainer(this.fileContainer);
    }

    /**
     * @param otherParty
     */
    public addOtherPartyMessenger(otherParty:EventMessenger) {
        debug('adding new other party');

        this.otherParties.push(otherParty);

        const syncParams:SyncActionParams = {remoteParty: otherParty, container: this.fileContainer, subject: this};

        otherParty.on(EventMessenger.events.died, ()=> {
            debug(`lost connection with remote party - permanently`);
            this.removeOtherParty(otherParty);
        });

        const syncCallback = (err)=> {
            if (err)return logger.error(err);

            this.emit(Engine.events.synced);
            return logger.info(`Synced successfully on first connection`);
        };

        setTimeout(()=>this.options.sync(syncParams, syncCallback), INITIAL_TIMEOUT);

        this.addEngineListenersToOtherParty(otherParty);
    }

    /**
     * Stops engine activity
     */
    public shutdown() {
        this.emit(Engine.events.shutdown);
        this.otherParties.forEach(otherParty => this.removeOtherParty(otherParty));
        this.fileContainer.shutdown();
    }

    /**
     * @param otherParty
     */
    public removeOtherParty(otherParty:EventMessenger) {
        otherParty.shutdown();
        const index = this.otherParties.indexOf(otherParty);
        this.otherParties.splice(index, 1);
    }

    /**
     * @param otherParty
     * @param fileName
     */
    public deleteRemoteFile(otherParty:EventMessenger, fileName:string):any {
        return otherParty.send(Engine.messages.fileDeleted, {fileName: fileName});
    }

    /**
     * @param otherParty
     * @param fileName
     * @param callback
     */
    public pushFileToRemote(otherParty:EventMessenger, fileName:string, callback:ErrorCallback):any {
        this.transferHelper.sendFileToRemote(otherParty, fileName, callback);
    }

    /**
     * @param otherParty
     * @param fileName
     */
    public createRemoteDirectory(otherParty:EventMessenger, fileName:string) {
        return otherParty.send(Engine.messages.directoryCreated, {fileName: fileName});
    }

    /**
     * @param otherParty
     * @param fileName
     * @param callback
     */
    public getRemoteFileMeta(otherParty:EventMessenger, fileName:string, callback:(err:Error, syncData?:SyncData)=>any):any {
        return otherParty.sendRequest(Engine.messages.getMetaForFile, {fileName: fileName}, callback);
    }

    /**
     * @param otherParty
     * @param callback
     */
    public getRemoteFileList(otherParty:EventMessenger, callback:(err:Error, fileList?:Array<string>)=>any):any {
        return otherParty.sendRequest(Engine.messages.getFileList, {}, callback);
    }

    /**
     * @param otherParty
     * @param fileName
     * @param callback
     */
    public requestRemoteFile(otherParty:EventMessenger, fileName:string, callback:ErrorCallback):any {
        this.transferHelper.getFileFromRemote(otherParty, fileName, callback);
    }

    private addEngineListenersToOtherParty(otherParty:EventMessenger) {
        otherParty.on(EventMessenger.events.error, (event)=> {
            return logger.error(`received error message ${JSON.stringify(event.body)}`);
        });

        otherParty.on(TransferHelper.outerEvent, (event)=> this.transferHelper.consumeMessage(event.body, otherParty));


        otherParty.on(Engine.messages.directoryCreated, (event)=> {
            this.fileContainer.createDirectory(event.body.fileName);
            debug(`finished creating a new directory: ${event.body.fileName} - emitting newDirectory event`);
            this.emit(Engine.events.newDirectory, event.body.fileName);

            return this.broadcastEvent(event.type, {fileName: event.body.fileName}, otherParty);
        });

        otherParty.on(Engine.messages.fileDeleted, (event)=> {
            this.fileContainer.deleteFile(event.body.fileName);
            this.emit(Engine.events.deletedPath, event.body.fileName);

            return this.broadcastEvent(event.type, event.body, otherParty);
        });

        otherParty.on(Engine.messages.fileChanged, (event)=> {
            return this.requestRemoteFile(otherParty, event.body.fileName, ()=> {
                debug(`finished downloading a file: ${event.body.fileName} - emitting changedFile event`);
                this.emit(Engine.events.changedFile, event.body.fileName);

                return this.broadcastEvent(event.type, event.body, otherParty);
            });
        });

        otherParty.on(Engine.messages.getFileList, (event)=> {
            return this.fileContainer.getFileTree((err, fileList)=> {
                if (err) {
                    return logger.error(err);
                }

                return otherParty.sendResponse(event, fileList);
            });
        });

        otherParty.on(Engine.messages.getMetaForFile, (event)=> {
            return this.fileContainer.getFileMeta(event.body.fileName, (err, syncData)=> {
                if (err) {
                    return logger.error(err);
                }

                return otherParty.sendResponse(event, syncData)
            })
        });

        debug(`finished adding listeners`);
    }

    private addListenersToFileContainer(fileContainer:FileContainer) {
        fileContainer.on(FileContainer.events.changed, (eventContent)=> {
            debug(`detected file changed: ${eventContent}`);
            return this.broadcastEvent(Engine.messages.fileChanged, {fileName: eventContent});
        });

        fileContainer.on(FileContainer.events.fileCreated, (eventContent)=> {
            debug(`detected file created: ${eventContent}`);
            return this.broadcastEvent(Engine.messages.fileChanged, {fileName: eventContent});
        });

        fileContainer.on(FileContainer.events.deleted, (eventContent)=> {
            debug(`detected file deleted: ${eventContent}`);
            return this.broadcastEvent(Engine.messages.fileDeleted, {fileName: eventContent});
        });

        fileContainer.on(FileContainer.events.createdDirectory, (eventContent)=> {
            return this.broadcastEvent(Engine.messages.directoryCreated, {fileName: eventContent});
        });
    }

    private broadcastEvent(eventType:string, body:any, excludeParty?:EventMessenger) {
        this.otherParties.forEach((otherParty)=> {
            if (excludeParty && excludeParty === otherParty) {
                return;
            }

            return otherParty.send(eventType, body);
        })
    }
}