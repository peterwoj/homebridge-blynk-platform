import { BlynkAccessory } from "./accessories";


export class BlynkPoller {
    private accessories:        BlynkAccessory[];
    private pollerMilliSeconds: number;
    private oneAtAtime:         boolean = false;
    private stopPoller:         boolean = false;

    constructor(seconds: number, accessories: BlynkAccessory[]) {
        this.pollerMilliSeconds = seconds * 1000;
        this.accessories = accessories;
    }

    setPollSeconds(seconds: number) { this.pollerMilliSeconds = seconds * 1000; }
    
    // Would be better to tie this to individual add events for each accessory
    // for now this will do.
    setPollerAccessoryList(accessories: BlynkAccessory[]): BlynkPoller {
        this.accessories.length =  0;
        this.accessories = accessories;
        console.log(`adding accessories: ${accessories.length}`);
        return this;
    }

    shutdown() { this.stopPoller = true; }

    poll() {
        if (!this.oneAtAtime) {
            this.oneAtAtime = true;
            this.accessories.forEach( accessory => accessory.getStatus() );
            this.oneAtAtime = false
            
            if (!this.stopPoller) {
                setTimeout( () => { this.poll() }, this.pollerMilliSeconds);
            }
        }
        
    }
}
