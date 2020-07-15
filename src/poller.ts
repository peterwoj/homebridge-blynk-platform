import { BlynkAccessory } from "./accessories";


export class BlynkPoller {
    private accessory: BlynkAccessory[];
    private pollerMilliSeconds: number;
    private oneAtAtime: boolean = false;

    constructor(seconds: number, accessory: BlynkAccessory[]) {
        this.pollerMilliSeconds = seconds * 1000;
        this.accessory = accessory;
    }

    poll() {
        if (!this.oneAtAtime) {
            this.oneAtAtime = true;
            this.accessory.map( acc => acc.getStatus() );
            this.oneAtAtime = false
            
            setTimeout( () => { this.poll() }, this.pollerMilliSeconds);
        }
        
    }
}
