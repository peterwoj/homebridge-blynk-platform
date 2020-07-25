import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    HAP,
    Logging,
    StaticPlatformPlugin,
    AccessoryPlugin,
    PlatformAccessory,
    PlatformConfig
} from "homebridge";
import { BlynkPoller } from "./poller";
import { BlynkAccessory } from "./accessories";

import {
    BlynkConfig,
    BlynkDeviceConfig,
} from "./config"

import {
    BlynkWidgetBase
} from "./widget"

const PLUGIN_NAME:string        = "homebridge-blynk-platform"
const PLATFORM_NAME:string      = "BlynkPlatform"

let api: API;
let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (homebridge: API) => {
    api = homebridge;
    hap = homebridge.hap;
    myConfig;
    Accessory = homebridge.platformAccessory;

    homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, BlynkPlatform);
}

let myConfig: BlynkConfig;

class BlynkPlatform implements DynamicPlatformPlugin {
    private readonly log:       Logging;
    private readonly accs:      PlatformAccessory[] =  [];
    
    private poll:               BlynkPoller;

    constructor(log: Logging, config: PlatformConfig, homebridge: API) {
        this.log = log;
        myConfig  = new BlynkConfig(homebridge.hap, this.log, config);
        this.poll = new BlynkPoller(myConfig.pollerSeconds, []);


        api.on(APIEvent.SHUTDOWN, () => {
            this.log.info(`${PLATFORM_NAME} is shutting down.`);
            this.poll.shutdown();
        });

        api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.log.info(`${PLATFORM_NAME} has finishing launching.`);
            this.fetchConfigs();
        });
    }

    // A PlatformAccessory must relate to a BlynkAccessory which is configured
    // by a class which extends BlynkWidgetBase.  Since configureAccessory() is 
    // triggered before fetchConfigs() only store the cached accessory details.
    // Wiring accessory events will happen within the related BlynkAccessory.
    configureAccessory(accessory: PlatformAccessory): void {
        this.accs.push(accessory);
    }

    // Once the platform is finished launching, bind the configuration to
    // events.
    fetchConfigs() {
        // Prepare a list of available accessories to
        //   1. Bind Homebridge to Blynk event
        //   2. Provide for poller to refresh state
        let plugins: BlynkAccessory[] = new Array<BlynkAccessory>();

        myConfig.devices.forEach( (device: BlynkDeviceConfig) => {
            (async() => {
                // Check to see if this device needs its configuration retrieved.
                if (device.discover) {
                    await device.readProject()
                }

                plugins.concat( 
                    device.widgets.map( (widget: BlynkWidgetBase) => {
                        let plugin: BlynkAccessory = new BlynkAccessory(hap, this.log, widget);
                        
                        let uuidSeed: string = (widget.getId() > 0) 
                            ? widget.getId.toString() 
                            : `${device.deviceId}-${device.manufacturer}-${widget.getModel()}-${widget.getPinType()}-${widget.getPinNumber()}`;
                        let accId = hap.uuid.generate(uuidSeed);
                        this.log.debug(`PlatformAccessory: identified ${plugin.name} - ${widget.getId()} [${accId}]`);

                        let haveAcc = this.accs.find( accessory => accessory.UUID === accId);
                        if (!haveAcc) {
                            let platAcc = new Accessory(plugin.name, accId);
                            
                            plugin.attachAccessory(platAcc);
                            this.configureAccessory(platAcc);
                            api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [platAcc]);
                        }
                        else {
                            plugin.attachAccessory(haveAcc);
                        }

                        return plugin;
                    })
                );
            })();
        });

        // Start the refresh service
        this.poll
            .setPollerAccessoryList(plugins)
            .poll();
    }
}