import {
    API,
    HAP,
    Logging,
    StaticPlatformPlugin,
    AccessoryPlugin,
    PlatformConfig
} from "homebridge";
import { BlynkAccessory, BlynkAccessoryConfig } from "./accessories";

const DEFAULT_POLLER_PERIOD:number  = 1;

const PLUGIN_NAME:string        = "homebridge-blynk-platform"
const PLATFORM_NAME:string      = "BlynkPlatform"

let hap: HAP;
// let Accessory: typeof PlatformAccessory;

export = (homebridge: API) => {
    hap = homebridge.hap;
    myConfig;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, BlynkPlatform);
}

class BlynkConfig {
    platform:       string;
    serverurl:      string;
    token:          string;
    pollerPeriod:   number;
    accessories:    BlynkAccessoryConfig[];

    constructor() {
        this.platform       = "";
        this.serverurl      = "";
        this.token          = "";
        this.pollerPeriod   = DEFAULT_POLLER_PERIOD;
        this.accessories    = Array<BlynkAccessoryConfig>();
    }

    getBaseUrl(): string {
        return `${this.serverurl}/${this.token}`;
    }
}

let myConfig: BlynkConfig = new BlynkConfig();
let wantConfig: Array<string>= ['serverurl', 'token', 'pollerseconds', 'platform', 'accessories'];

class BlynkPlatform implements StaticPlatformPlugin {
    private readonly log:           Logging;
    // private readonly homebridge:    API;

    constructor(log: Logging, config: PlatformConfig, homebridge: API) {
        this.log = log;

        for ( let wantKey of wantConfig ) {
            let confValue: any = config[wantKey];
            if (confValue == null || confValue === '') {
                log.error(`Failed to locate configuration for ${ wantKey } unable to continue`);
            }
            else {
                switch (wantKey) {
                    case "serverurl":
                        myConfig.serverurl = confValue;
                        break;
                    case "token":
                        myConfig.token = confValue;
                        break;
                    case "pollerseconds":
                        myConfig.pollerPeriod = parseInt(confValue);
                        break;
                    case "platform":
                        myConfig.platform = confValue;
                        break;
                    case "accessories":
                        
                        break;
                    default:
                        log.warn(`Unknown key ${wantKey} was attempted.`)
                }
                log.debug("have a key name '%s' -> '%s'", wantKey, config[wantKey]);
            }
        }
        this.configAccessories(config["accessories"]);
    }

    private configAccessories(accessories: Record<string, any>) {
        if (accessories != null) {
            accessories.map((entry: Record<string, any>, index: number) => {
                let blynkAcc: BlynkAccessoryConfig = new BlynkAccessoryConfig(entry['name'], entry['pintype'], entry['pinnumber'], myConfig.getBaseUrl())
                myConfig.accessories.push(blynkAcc);
                this.log.info("found: '%s' ", blynkAcc.toString());
            })
        }

        this.log.info("Blynk Platform is online");
    }

    accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
        let plugins: AccessoryPlugin[] = new Array<AccessoryPlugin>();
        
        myConfig.accessories.map((config: BlynkAccessoryConfig) => {
            plugins.push( new BlynkAccessory(hap, this.log, config));
        })
        
        callback( plugins );
    }
}