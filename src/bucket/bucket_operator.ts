/// <reference path="../../typings/main.d.ts" />

import {FileContainer} from "../fs_helpers/file_container";
import {EventsHelper} from "../client/events_helper";
import {TransferQueue} from "../transport/transfer_queue";
import {Messenger} from "../transport/messenger";
import {Client} from "../client/client";
import {TransferActions} from "../transport/transfer_actions";
import {loggerFor, debugFor} from "../utils/logger";

const debug = debugFor("syncrow:bucket_operator");
const logger = loggerFor('BucketOperator');

export class BucketOperator {
    private path:string;
    private host:string;
    private otherParties:Array<Messenger>;
    private container:FileContainer;
    private otherPartiesMessageListeners:Array<Function>;
    private transferJobsQueue:TransferQueue;

    constructor(host:string, path:string, transferConcurrency = 10) {
        this.path = path;
        this.host = host;
        this.container = new FileContainer(path);
        this.otherParties = [];
        this.otherPartiesMessageListeners = [];
        this.transferJobsQueue = new TransferQueue(transferConcurrency);
    }

    /**
     * @param otherParty
     */
    public addOtherParty(otherParty:Messenger) {
        debug(`adding other party`);
        const messageListener = (message)=>this.handleEvent(otherParty, message);

        otherParty.once(Messenger.events.died, ()=>this.removeOtherParty(otherParty));
        otherParty.once(Messenger.events.recovering, ()=>this.removeOtherParty(otherParty));
        otherParty.on(Messenger.events.message, (message)=> messageListener(message));

        this.otherParties.push(otherParty);
        this.otherPartiesMessageListeners.push(messageListener);
    }

    /**
     * Completely removes otherParty from operaor
     * @param otherParty
     */
    public removeOtherParty(otherParty:Messenger) {
        const index = this.otherParties.indexOf(otherParty);
        const messageListener = this.otherPartiesMessageListeners[index];

        otherParty.removeListener(Messenger.events.message, messageListener);

        this.otherParties.splice(index, 1);
        this.otherPartiesMessageListeners.splice(index, 1);
    }

    private handleEvent(otherParty:Messenger, message:string) {
        const event = EventsHelper.parseEvent(otherParty, message);

        debug(`got event from other party: ${event}`);

        if (this.handleTransferEvent(otherParty, event)) {
            debug('Server handled transfer event');
            return;

        } else if (event.type === Client.events.directoryCreated) {
            this.container.createDirectory(event.body);
            this.broadcastEvent(event.type, event.body, otherParty);
            return;

        } else if (event.type === Client.events.fileDeleted) {
            this.container.deleteFile(event.body);
            this.broadcastEvent(event.type, event.body, otherParty);
            return;

        } else if (event.type === Client.events.getFile) {
            EventsHelper.writeEventToOtherParty(otherParty, TransferActions.events.connectAndDownload, event.body);
            return;

        } else if (event.type === EventsHelper.events.error) {
            logger.warn(`received error message ${JSON.stringify(event.body)}`);
            return;
        }

        EventsHelper.writeEventToOtherParty(otherParty, EventsHelper.events.error, `unknown event type: ${event.type}`);
    }

    private handleTransferEvent(otherParty:Messenger, event:{type:string, body?:any}):boolean {
        if (event.type === TransferActions.events.connectAndDownload) {
            this.transferJobsQueue.addConnectAndDownloadJobToQueue(event.body.address, event.body.fileName,
                this.container, `Server - downloading: ${event.body.fileName}`, ()=> {
                    this.broadcastEvent(Client.events.fileChanged, event.body.fileName, otherParty);
                });
            return true;

        } else if (event.type === TransferActions.events.connectAndUpload) {
            this.transferJobsQueue.addConnectAndUploadJobToQueue(event.body.fieldName, event.body.address,
                this.container, `Server - uploading: ${event.body.fieldName}`);
            return true;

        } else if (event.type === TransferActions.events.listenAndDownload) {
            this.transferJobsQueue.addListenAndDownloadJobToQueue(otherParty, event.body.fileName, this.host,
                this.container, `Server - downloading: ${event.body.fileName}`, ()=> {
                    this.broadcastEvent(Client.events.fileChanged, event.body.fileName, otherParty);
                });
            return true;

        } else if (event.type === TransferActions.events.listenAndUpload) {
            this.transferJobsQueue.addListenAndUploadJobToQueue(event.body.fileName, otherParty, this.host,
                this.container, `Server - uploading: ${event.body.fileName}`);
            return true;

        }
        return false;
    }

    private broadcastEvent(eventType:string, body:any, excludeParty?:Messenger) {
        this.otherParties.forEach((otherParty)=> {
            if (excludeParty && excludeParty === otherParty) {
                return;
            }

            EventsHelper.writeEventToOtherParty(otherParty, eventType, body);
        })
    }
}