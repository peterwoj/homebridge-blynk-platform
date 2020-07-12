import { AccessoryPlugin, HAP, Logging, Service, CharacteristicEventTypes, CharacteristicGetCallback, CharacteristicValue, CharacteristicSetCallback } from "homebridge";

export class BlynkAccessoryConfig {
    private pinType:    string;
    private pinNumber:  number;
    private baseUrl:    string;
    name:       string;
    
    constructor(name: string, pinType: string, pinNumber: number, baseUrl: string) {
        this.name       = name;
        this.pinType    = pinType
        this.pinNumber  = pinNumber;
        this.baseUrl    = baseUrl;
    }

    getPin(): string {
        let pinFormat: string = (this.pinType.toLowerCase() === "virtual") ? "V" : "";
        return `${this.baseUrl}/get/${pinFormat}${this.pinNumber}`;
    }

    setPin(on: boolean): string {
        let pinFormat: string = (this.pinType.toLowerCase() === "virtual") ? "V" : "";
        let pinSetting: number = (on) ? 1 : 0;
        return `${this.baseUrl}/update/${pinFormat}${this.pinNumber}?value=${pinSetting}`;
    }

    toString(): string {
        return `${this.name} can be found on ${this.pinType} pin ${this.pinNumber}`;
    }
}


export class BlynkAccessory implements AccessoryPlugin {
    private log: Logging;
    private readonly switchService: Service;
    private readonly infoService: Service;

    private readonly got = require('got');

    private myConfig: BlynkAccessoryConfig;
    private switchOn: boolean = false;

    name: string

    constructor(hap: HAP, log: Logging, config: BlynkAccessoryConfig) {
        this.log = log;
        this.myConfig = config;
        this.name = this.myConfig.name;

        this.switchService = new hap.Service.Switch(this.myConfig.name);
        
        this.switchService
            .getCharacteristic(hap.Characteristic.On)
            .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
                log.info("Current state of the switch was returned: " + (this.switchOn ? "ON" : "OFF"));               
                this.requestUrl(this.myConfig.getPin())
                    .then((body: string) => {
                        this.switchOn = (body == '["1"]');
                        log.info(`the switch is ${this.switchOn} as body is ${body}`)
                        callback(undefined, this.switchOn);
                    })
                    .catch((error) => {
                        log.warn(`request for status failed: ${error}`);
                        log.warn(`${this.myConfig.getPin()}`);
                        callback(error, this.switchOn);
                    });
            })
            .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
                this.switchOn = value as boolean;
                this.requestUrl(this.myConfig.setPin(this.switchOn))
                    .then((body: string) => {
                        callback();
                    })
                    .catch((error) => {
                        log.warn(`Unable to set ${this.name}: ${error.message}`);
                    })
                    ;
            });
        
        this.infoService = new hap.Service.AccessoryInformation()
            .setCharacteristic(hap.Characteristic.Manufacturer, "Switch Manufacturer")
            .setCharacteristic(hap.Characteristic.Model, "Switch Model");

        this.log.info(`Switch ${this.myConfig.name} has been created`);
    }
    
    private async requestUrl(url: string): Promise<string> {
        try {
            let response = await this.got(url);
            return response.body;
        } catch (error) {
            throw new Error(error);
        }
    }

    identify(): void {
        this.log(`Identify yourself ${this.myConfig.name}`);
    }

    getServices(): Service[] {
        return [
            this.infoService,
            this.switchService
        ];
    }
}