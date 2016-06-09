import {EventEmitter} from "events";
import {FileContainer} from "../fs_helpers/file_container";
import {Messenger} from "../connection/messenger";


export interface SyncData {
    hashCode:string;
    modified:Date;
    name:string;
    isDirectory:boolean,
    exists:boolean
}

export interface StrategySubject {
    getRemoteFileMeta(otherParty:Messenger, fileName:string, callback:(err:Error, syncData?:SyncData)=>any):any;
    getRemoteFileList(otherParty:Messenger, callback:(err:Error, fileList?:Array<string>)=>any):any;
    requestRemoteFile(otherParty:Messenger, fileName:string, callback:Function):any;
}

export abstract class SynchronizationStrategy extends EventEmitter {
    protected subject:StrategySubject;
    protected container:FileContainer;

    constructor() {
        super();
    }

    /**
     * Used to inject properties by clients
     * @param subject
     * @param container
     */
    public setData(subject:StrategySubject, container:FileContainer){
        this.subject = subject;
        this.container = container;
    }

    /**
     * @param otherParty
     * @param callback
     */
    public abstract synchronize(otherParty:Messenger, callback?:Function)
}
