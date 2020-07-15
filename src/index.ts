import {
    API,
    HAP,
    Logging,
    StaticPlatformPlugin,
    AccessoryPlugin,
    PlatformConfig
} from "homebridge";
import { BlynkPoller } from "./poller";
import { BlynkAccessory, BlynkAccessoryConfig } from "./accessories";

const DEFAULT_POLLER_PERIOD:number  = 1;

const PLUGIN_NAME:string        = "homebridge-blynk-platform"
const PLATFORM_NAME:string      = "BlynkPlatform"

let hap: HAP;

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
    devices:        BlynkDeviceConfig[];

    constructor() {
        this.platform       = "";
        this.serverurl      = "";
        this.token          = "";
        this.pollerPeriod   = DEFAULT_POLLER_PERIOD;
        this.devices        = Array<BlynkDeviceConfig>();
    }
}

class BlynkDeviceConfig {
    log:    Logging;
    maker:  string;
    name:   string;
    token:  string;
    accessories: BlynkAccessoryConfig[];

    constructor(log: Logging, device:Record<string,any>) {
        this.log = log;
        this.name = device['name'];
        this.token = device['token'];
        this.maker = device['manufacturer'];

        this.accessories = new Array<BlynkAccessoryConfig>();

        this.configAccessories(device['accessories']);
    }

    toString(): string {
        return `${this.name} has ${this.accessories.length} item(s).`
    }

    private configAccessories(accessoriesConfig: Array<Record<string, any>>) {
        if (accessoriesConfig != null) {
            accessoriesConfig.map((entry: Record<string, any>, index: number) => {
                let blynkAcc: BlynkAccessoryConfig = new BlynkAccessoryConfig(entry['name'], entry['pintype'], entry['pinnumber'], this.maker, entry['model'], this.deviceUrl())
                this.accessories.push(blynkAcc);
                this.log.info("found: '%s' ", blynkAcc.toString());
            })

            this.log.info(`accessories found: ${this.accessories.length}`);
        }
        else {
            this.log.warn("no accessories found....");
        }
    }

    private deviceUrl(): string {
        return `${myConfig.serverurl}/${this.token}`
    }
}

let myConfig: BlynkConfig = new BlynkConfig();

class BlynkPlatform implements StaticPlatformPlugin {
    private readonly log:           Logging;
    private poll?: BlynkPoller;

    constructor(log: Logging, config: PlatformConfig, homebridge: API) {
        this.log = log;

        let wantConfig: Array<string>= ['serverurl', 'pollerseconds', 'platform', 'devices'];
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
                    case "pollerseconds":
                        myConfig.pollerPeriod = parseInt(confValue);
                        break;
                    case "platform":
                        myConfig.platform = confValue;
                        break;
                    case "devices":
                        
                        break;
                    default:
                        log.warn(`Unknown key ${wantKey} was attempted.`)
                }
                log.debug("have a key name '%s' -> '%s'", wantKey, config[wantKey]);
            }
        }
        this.configDevices(config["devices"]);

        this.log.info("Blynk Platform is online");
    }

    private configDevices(devices: Array<Record<string, any>>) {
        if (devices == null) {
            return;
        }

        devices.map((device: Record<string,any>) => {
            let devConf = new BlynkDeviceConfig( this.log, device );
            myConfig.devices.push( devConf );

            this.log.debug(`${devConf.toString()}`);
        });
    }

    accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
        let plugins: BlynkAccessory[] = new Array<BlynkAccessory>();

        myConfig
            .devices.map( (device: BlynkDeviceConfig) => {
                device
                    .accessories.map((config: BlynkAccessoryConfig) => {
                        let acc = new BlynkAccessory(hap, this.log, config);
                        plugins.push( acc );
                });
        });
        this.poll = new BlynkPoller(myConfig.pollerPeriod, plugins);
        this.poll.poll();
        callback( plugins );
    }
}