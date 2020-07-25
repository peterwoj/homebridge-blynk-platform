import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    HAP,
    Logging,
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

const PLUGIN_NAME        = "homebridge-blynk-platform"
const PLATFORM_NAME      = "BlynkPlatform"

let api: API;
let hap: HAP;
let Accessory: typeof PlatformAccessory;

export = (homebridge: API): void => {
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
        this.poll = new BlynkPoller(log, myConfig.pollerSeconds, []);


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
        const plugins: BlynkAccessory[] = new Array<BlynkAccessory>();
        const platAccessories: PlatformAccessory[] = [];

        myConfig.devices.forEach( (device: BlynkDeviceConfig) => {
            (async() => {
                // Check to see if this device needs its configuration retrieved.
                if (device.discover) {
                    await device.readProject()
                }

                device.widgets.forEach( (widget: BlynkWidgetBase) => {
                    const plugin: BlynkAccessory = new BlynkAccessory(hap, this.log, widget);

                    const uuidSeed: string = (widget.getId() > 0)
                        ? widget.getId.toString()
                        : `${device.deviceId}-${device.manufacturer}-${widget.getModel()}-${widget.getPinType()}-${widget.getPinNumber()}`;
                    const accId = hap.uuid.generate(uuidSeed);
                    this.log.debug(`PlatformAccessory: identified ${plugin.name} - ${widget.getId()} [${accId}]`);

                    let haveAcc = this.accs.find( accessory => accessory.UUID === accId);
                    if (!haveAcc) {
                        haveAcc = new Accessory(plugin.name, accId);

                        plugin.attachAccessory(haveAcc);
                        api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [haveAcc]);
                    }
                    else {
                        plugin.attachAccessory(haveAcc);
                    }
                    platAccessories.push(haveAcc);
                    plugins.push(plugin);
                });
            })();
        });

        // Remove any found orphans, these are caused by configuration changes
        this.accs
            .filter(orphan => ! platAccessories.includes(orphan))
            .forEach(orphan => {
                this.log.info(`Removing: ${orphan.displayName} - ${orphan.UUID}`);
                api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [orphan])
            });
        this.accs.length = 0;
        platAccessories.forEach( acc => this.accs.push(acc) );

        // Start the refresh service
        this.poll
            .setPollerAccessoryList(plugins)
            .poll();
    }
}