import {
    HAP,
    Logging
} from "homebridge"

import {
    BlynkWidgetBase,
    BlynkWidgetButton
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
                    "pintype": "virtual",
                    "pinnumber": "1",
                    "model": "accessory model"
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

    constructor(hap: HAP, log: Logging, config:Record<string, any>) {
        this.hap = hap;
        this.log = log;

        for ( let confKey of this.NEED_CONFIG) {

            let confValue = config[confKey] 
                ?? function(){ throw new Error(`Missing configuration for ${confKey}`) }

            switch (confKey) {
                case "serverurl":                    
                    this.baseUrl = (confValue[confValue.length -1] === '/') 
                        ? confValue.slice(0, -1) 
                        : confValue;
                    break;
                case "devices":
                    break;
                default:
                    log.info(`Unknown configuration found: ${confKey}`);
            }
        }

        this.platform       = config['platform']        ?? "BlynkPlatform";
        this.pollerSeconds  = config['pollerseconds']   ?? 10;

        this.devices = new Array<BlynkDeviceConfig>();

        config['devices'].forEach((device: Record<string, any>) => {
            let deviceConfig = new BlynkDeviceConfig(this.hap, this.log, this.baseUrl, device);
            this.devices.push(deviceConfig);
        })

    }
}

export class BlynkDeviceConfig {
    private readonly NEED_CONFIG:   string[] = ['name', 'token'];
    private readonly hap:           HAP;
    private readonly log:           Logging;
    private readonly serverUrl:     string;
    readonly token:         string  = "";
    readonly manufacturer:  string;
    readonly discover:      boolean;
    readonly deviceId:      number  = 0;
    name:                   string  = "";
    widgets:                BlynkWidgetBase[];

    constructor(hap: HAP, log: Logging, baseUrl: string, config: Record<string, any>) {
        this.hap = hap;
        this.log = log;

        for ( let confKey of this.NEED_CONFIG) {
            let confValue = config[confKey]
                ?? function() { throw new Error(`Device Config missing configuration ${confKey}`)};
            
            switch (confKey) {
                case 'name':
                    this.name = confValue;
                    break;
                case 'token':
                    this.token = confValue;
                default:
                    log.info(`Unknown device configuration found ${confKey} -> ${confValue}`);
            }
        }

        this.serverUrl      = `${baseUrl}/${this.token}`;
        this.manufacturer   = config['manufacturer']    ?? "Wojstead";
        this.discover       = config['discover']        ?? false;

        this.widgets = new Array<BlynkWidgetBase>();
        if (this.discover === false) {
            let accList: Array<Record<string, any>> = config['accessories']
                ?? function(){ throw new Error(`Discovery is set to false and accessories were not defined.`) };
            /*
                {
                    "name": "item name",
                    "type": "BUTTON",
                    "pintype": "virtual",
                    "pinnumber": "1",
                    "model": "accessory model"
                }
            */
            accList.forEach((acc: Record<string, any>) => {
                let accItem: BlynkWidgetButton = new BlynkWidgetButton(this.log, this.serverUrl, acc);
                this.widgets.push(accItem);
            });
        }
        else {
            this.deviceId = config['deviceId']
                ?? function() { throw new Error('Discovery is set but missing deviceId to link with token')};
        }
    }

    async readProject() {
        let project: IBlynkProject = await this.getProjectJSON();
        
        this.name = project.name;

        project.widgets.forEach( (widget: IBlynkWidget) => {
            if (widget.deviceId === this.deviceId) {
                switch (widget.type) {
                    case "TABS":
                    case "LCD":
                        this.log.debug(`Discover skip: ${widget.label}[${widget.id}] - ${widget.type}`)
                        break;
                    case "BUTTON":
                    case "STYLED_BUTTON":
                        let newWidget = new BlynkWidgetButton(this.log, this.serverUrl, 
                            { 
                                "id":           widget.id,
                                "name":         widget.label,
                                "label":        widget.label,
                                "type":         widget.type,
                                "pintype":      widget.pinType,
                                "pinnumber":    widget.pin,
                            }
                        );
                        this.log.info(`Discover found: ${newWidget.toString()}`);
                        this.widgets.push(newWidget);
                        break;
                    default:
                        this.log.debug(`Skipped item: ${widget.label} is a ${widget.type}`);
                }
            }
        })  
    }

    private async getProjectJSON(): Promise<IBlynkProject> {
        let got = require('got');

        try {
            let response = await got(`${this.serverUrl}/project`);
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
    isUserIcon:     boolean;
    name:           string;
    vendor:         string;
}

interface IBlynkWidget {
    id:         number;         // widget id
    deviceId:   number;         // id of device the widget is bound to
    label:      string;         // label of the widget
    pin:        number;         // pin number the widget is connected to
    type:       string;         // type of widget, can be anything you want provided it's a BUTTON
    pinType:    string;         // type of pin used
    max:        number;
    min:        number;
    value:      string;
}