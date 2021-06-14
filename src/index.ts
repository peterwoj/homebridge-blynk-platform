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
    PACKGE_CONFIG,
    PLUGIN_NAME,
    PLATFORM_NAME
} from "./settings"

import {
    BlynkWidgetBase
} from "./widget"

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
    // Loaded from homebridge accessory cache
    private readonly accs:      PlatformAccessory[] =  [];

    // Found in homebridge-blynk-platform plugin configuration
    // or fetched from blynk-server
    private plugins:            BlynkAccessory[]    = new Array<BlynkAccessory>();
    // Accessories currently active, used to filter out what was read
    // from the accessory cache
    private platAccessories:    PlatformAccessory[] = [];
    private needToFetchConfigs                      = 0;
    private poll:               BlynkPoller;

    constructor(log: Logging, config: PlatformConfig, homebridge: API) {
        this.log = log;
        myConfig  = new BlynkConfig(this.log, config);
        this.poll = new BlynkPoller(this.log, myConfig.pollerSeconds, []);

        this.needToFetchConfigs = myConfig.devices.length;
        this.isConfigurtionReady();

        this.log.info(
            '%s v%s, node %s, homebridge v%s, api v%s',
            PACKGE_CONFIG.name,
            PACKGE_CONFIG.version,
            process.version,
            api.serverVersion,
            api.version
          );

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
        myConfig.devices.forEach( (device: BlynkDeviceConfig) => {
            (async() => {
                // Check to see if this device needs its configuration retrieved.
                if (device.discover) {
                    await device.readProject().catch((error) => { this.log.error(`error reading project: ${error}`) });
                }
                this.needToFetchConfigs--;

                device.widgets.forEach( (widget: BlynkWidgetBase) => {
                    const plugin: BlynkAccessory = new BlynkAccessory(hap, this.log, widget);

                    const uuidSeed: string = (widget.getId() > 0)
                        ? `${device.token}-${widget.getId().toString()}`
                        : `${device.deviceId}-${device.manufacturer}-${widget.getModel()}-${widget.getPinType()}-${widget.getPinNumber()}`;
                    const accId = hap.uuid.generate(uuidSeed);

                    this.log.debug(`PlatformAccessory: identified ${plugin.name}(${widget.getTypeOf()}) - ${widget.getId()} [${accId}] seed: ${uuidSeed}`);
                    let haveAcc = this.accs.find(accessory => accessory.UUID === accId);
                    if (!haveAcc) {
                        haveAcc = new Accessory(plugin.name, accId);
                        plugin.attachAccessory(haveAcc);
                        api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [haveAcc]);
                    }
                    else {
                        plugin.attachAccessory(haveAcc);
                    }

                    this.platAccessories.push(haveAcc);
                    this.plugins.push(plugin);
                });
            })();
        });
    }

    // Clean up the accessory cache once all devices
    // have had their configurations defined.
    isConfigurtionReady(): void {
        const waitForConfigInMilliSeconds   = 500;
        this.log.debug(`Checking if config is ready: waiting for ${waitForConfigInMilliSeconds} ms remaining configs to fetch: ${this.needToFetchConfigs}`)
        if (this.needToFetchConfigs <= 0) {
            this.cleanUpAccessories();
        }
        else {
            setTimeout( () => { this.isConfigurtionReady() }, waitForConfigInMilliSeconds);
        }
    }

    cleanUpAccessories() {
        // Remove any found orphans, these are caused by configuration changes
        this.log.info(`Checking if accessories have been removed to clean up cache.`);
        this.accs
            .filter(orphan => ! this.platAccessories.includes(orphan))
            .forEach(orphan => {
                this.log.info(`Removing accessory: ${orphan.displayName} - ${orphan.UUID}`);
                api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [orphan])
            });
        this.accs.length = 0;
        this.platAccessories.forEach( acc => {
            this.log.debug(`Committing defined accessory(${acc.displayName}) to cache`);
            this.accs.push(acc);
        });

        // Start the refresh service
        this.poll
            .setPollerAccessoryList(this.plugins)
            .poll();
    }
}