import { Logging } from "homebridge";
import { BlynkAccessory } from "./accessories";


export class BlynkPoller {
    private readonly log:       Logging;
    private accessories:        BlynkAccessory[];
    private pollerMilliSeconds: number;
    private oneAtAtime          = false;
    private stopPoller          = false;

    constructor(log: Logging, seconds: number, accessories: BlynkAccessory[]) {
        this.log = log;
        this.pollerMilliSeconds = seconds * 1000;
        this.accessories = accessories;
    }

    setPollSeconds(seconds: number): void { this.pollerMilliSeconds = seconds * 1000; }

    // Would be better to tie this to individual add events for each accessory
    // for now this will do.
    setPollerAccessoryList(accessories: BlynkAccessory[]): BlynkPoller {
        this.accessories.length =  0;
        this.accessories = accessories;
        this.log.debug(`accessories to scan: ${accessories.length}`);
        return this;
    }

    shutdown(): void {
        this.log.info(`Poller: Asked to shutdown`);
        this.stopPoller = true;
    }

    poll(): void {
        if (!this.oneAtAtime) {
            this.oneAtAtime = true;
            this.accessories.forEach( accessory => {
                accessory.getStatus();
            });
            this.oneAtAtime = false

            if (!this.stopPoller) {
                setTimeout( () => { this.poll() }, this.pollerMilliSeconds);
            }
            else {
                this.log.info(`Last poller execution due to ask to shutdown.`);
            }
        }

    }
}
