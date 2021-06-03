import {
    HAP,
    Logging
} from "homebridge"
import { HOMEKIT_TYPES } from "./accessories";

import {
    BlynkWidgetBase,
    BlynkWidgetButton,
    BlynkWidgetDimmer,
    IBlynkWidget,
} from "./widget"

/*

{
    "platform": "BLynkPlatform",
    "serverurl": "http://wwww.blynk.server",
    "pollerperiod": "seconds",
    "devices": [
        {
            "name": "blynk app name",
            "token": "auth  token",
            "manufacturer": "who_done_it",
            "discover": true
        },
        {
            "name": "blynk app name",
            "token": "auth  token",
            "manufacturer": "who_done_it",
            "discover": false,
            "accessories": [
                {
                    "name": "item name",
                    "type": "BUTTON",
                    "typeOf": "homekit control type",
                    "pintype": "virtual",
                    "pinnumber": "1",
                    "model": "accessory model",
                },
                {
                    "name": "item name",
                    "type": "LABEL",
                    "typeOf": "temperature",
                    "pintype": "virtual",
                    "pinnumber": "1",
                    "model": "accessory model",
                }
            ]
        }
    ]
}

Config will hold devices
a device contains widgets

*/

export class BlynkConfig {
    private readonly NEED_CONFIG:   string[] = ['serverurl', 'devices'];
    private readonly hap:           HAP;
    private readonly log:           Logging;
    private readonly baseUrl:       string = "";
    readonly platform:              string;
    readonly pollerSeconds:         number;
    devices:                        BlynkDeviceConfig[];

    constructor(hap: HAP, log: Logging, config:Record<string, unknown>) {
        this.hap = hap;
        this.log = log;

        for ( const confKey of this.NEED_CONFIG) {

            const confValue = config[confKey]
                ?? function(){ throw new Error(`Missing configuration for ${confKey}`) }

            switch (confKey) {
                case "serverurl":
                    this.baseUrl = confValue as string;
                    this.baseUrl = (this.baseUrl[this.baseUrl.length -1] === '/')
                        ? this.baseUrl.slice(0, -1)
                        : this.baseUrl;
                    break;
                case "devices":
                    break;
                default:
                    log.info(`Unknown configuration found: ${confKey}`);
            }
        }

        this.platform       = String(config['platform'])        || "BlynkPlatform";
        this.pollerSeconds  = Number(config['pollerseconds'])   || 10;

        this.devices = new Array<BlynkDeviceConfig>();

        const confDevices: Record<string, string | number>[] = config['devices'] as Record<string, string | number>[];
        if (confDevices != undefined) {
            confDevices.forEach((device: Record<string, string|number>) => {
                const deviceConfig = new BlynkDeviceConfig(this.hap, this.log, this.baseUrl, device);
                this.devices.push(deviceConfig);
            });
        }
        else {
            log.error("Devices are missing from your configuration");
        }
    }
}

// Blynk Device is each microcontroller attached to a project
export class BlynkDeviceConfig {
    private readonly NEED_CONFIG:   string[] = ['name', 'token'];
    private readonly hap:           HAP;
    private readonly log:           Logging;
    private readonly serverUrl:     string;
    readonly token:                 string  = "";
    readonly manufacturer:          string;
    readonly discover:              boolean;
    readonly deviceId:              number  = 0;
    name                            = "";
    widgets:                        BlynkWidgetBase[];

    constructor(hap: HAP, log: Logging, baseUrl: string, config: Record<string, string | number | boolean | Record<string,string> | Array<Record<string,string>> >) {
        this.hap = hap;
        this.log = log;

        for ( const confKey of this.NEED_CONFIG) {
            const confValue = config[confKey]
                ?? function() { throw new Error(`Device Config missing configuration ${confKey}`)};

            switch (confKey) {
                case 'name':
                    this.name = confValue as string;
                    break;
                case 'token':
                    this.token = confValue as string;
                    break;
                default:
                    log.info(`Unknown device configuration found ${confKey} -> ${confValue}`);
            }
        }

        this.serverUrl      = `${baseUrl}/${this.token}`;
        this.manufacturer   = config['manufacturer']    as string    ?? "Wojstead";
        this.discover       = config['discover']        as boolean   ?? false;

        this.widgets = new Array<BlynkWidgetBase>();
        if (this.discover === false) {
            const accList: Array<Record<string, string|number>> = config['accessories'] as Array<Record<string,string|number>>
                ?? function(){ throw new Error(`Discovery is set to false and accessories were not defined.`) };
            /*
                {
                    "name": "item name",
                    "type": "BUTTON",  {BUTTON, SLIDER, }
                    "pintype": "virtual",
                    "pinnumber": 1,
                    "model": "accessory model"
                }
            */
           if (accList.length > 0) {
                accList.forEach((acc: Record<string, string | number>) => {
                    const widget: IBlynkWidget = {
                        'id':       acc['id']           as number,
                        'deviceId': acc['deviceId']     as number ?? 0,
                        'label':    acc['label']        as string,
                        'pin':      acc['pinnumber']    as number,
                        'type':     acc['type']         as string,
                        'pinType':  acc['pintype']      as string,
                        'max':      acc['max']          as number,
                        'min':      acc['min']          as number,
                        'value':    acc['value']        as string,
                        'typeOf':   acc['typeOf']       as string ?? HOMEKIT_TYPES.UNDEFINED
                    };
                    this.log.info(`Adding accessory: ${widget.label}`);
                    this.addWidget(widget);
                });
            }
            else {
                this.log.warn(`Accessories were not defined and discover is set to false.`);
            }
        }
        else {
            this.deviceId = config['deviceId'] as number
                ?? function() { throw new Error('Discovery is set but missing deviceId to link with token')};
        }
    }

    addWidget(widget: IBlynkWidget): void {
        if (widget.deviceId === this.deviceId) {
            switch (widget.type) {
                case "NUMBER_INPUT":
                case "TIME_INPUT":
                case "GAUGE":
                case "SEGMENTED_CONTROL":
                case "TABS":
                case "LCD":
                    this.log.debug(`addWidget skip: ${widget.label}[${widget.id}] - ${widget.type}`)
                    break;
                case "SLIDER":
                    this.widgets.push( new BlynkWidgetDimmer(this.log, this.serverUrl,
                        {
                            "id":           widget.id,
                            "name":         widget.label,
                            "label":        widget.label,
                            "type":         widget.type,
                            "pintype":      widget.pinType,
                            "pinnumber":    widget.pin,
                            "min":          widget.min,
                            "max":          widget.max,
                            "typeOf":       widget.typeOf
                        }
                    ));
                    this.log.info(`addWidget found: ${this.widgets.slice(-1)[0].toString()}`);
                    break;
                case "BUTTON":
                case "STYLED_BUTTON":
                    this.widgets.push( new BlynkWidgetButton(this.log, this.serverUrl,
                        {
                            "id":           widget.id,
                            "name":         widget.label,
                            "label":        widget.label,
                            "type":         widget.type,
                            "pintype":      widget.pinType,
                            "pinnumber":    widget.pin,
                            "min":          widget.min,
                            "max":          widget.max,
                            "typeOf":       widget.typeOf
                        }
                    ));
                    this.log.info(`addWidget found: ${this.widgets.slice(-1)[0].toString()}`);
                    break;
                default:
                    this.log.debug(`addWidget skipped item: ${widget.label} is a ${widget.type}`);
            }
        }
    }

    async readProject(): Promise<void> {
        const project: IBlynkProject = await this.getProjectJSON();
        this.name = project.name;

        project.widgets.forEach( (widget: IBlynkWidget) => {
            this.addWidget(widget);
        })
    }

    private async getProjectJSON(): Promise<IBlynkProject> {
        const got = require('got');
        const options = {
            dnsCache: true,
            retry: {
                limit: 10
            }
        };

        try {
            const response = await got(`${this.serverUrl}/project`, options)
            return JSON.parse(response.body);
        } catch (error) {
            throw new Error(error);
        }
    }
}

// JSON interface for reading Blynk Project used
// for discovery of controls to expose to
// Homebridge
interface IBlynkProject {
    id:         number;
    name:       string;
    isActive:   boolean;
    devices:    IBlynkDevice[];
    widgets:    IBlynkWidget[];
}

interface IBlynkDevice {
    boardType:      string;
    connectionType: string;
    id:             number;
    name:           string;
    isUserIcon:     boolean;
    vendor:         string;
}