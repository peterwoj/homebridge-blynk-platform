import { AccessoryPlugin, HAP, Logging, Service, Characteristic, CharacteristicEventTypes, CharacteristicGetCallback, CharacteristicValue, CharacteristicSetCallback } from "homebridge";

export class BlynkAccessoryConfig {
    private pinType:    string;
    private pinNumber:  number;
    private baseUrl:    string;
    name:               string;
    maker:              string;
    model:              string;
    
    constructor(name: string, pinType: string, pinNumber: number, maker: string, model: string, baseUrl: string) {
        this.name       = name;
        this.maker      = maker;
        this.model      = model;
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
        return `${this.name} from ${this.maker} (${this.model}) can be found on ${this.pinType} pin ${this.pinNumber}`;
    }
}


export class BlynkAccessory implements AccessoryPlugin {
    private log: Logging;
    private readonly hap: HAP;
    private readonly switchService: Service;
    private readonly infoService: Service;

    private readonly got = require('got');

    private myConfig: BlynkAccessoryConfig;
    private switchOn: boolean = false;

    name: string

    constructor(hap: HAP, log: Logging, config: BlynkAccessoryConfig) {
        this.hap = hap;
        this.log = log;
        this.myConfig = config;
        this.name = this.myConfig.name;


        log.info(`pin: ${this.myConfig.getPin()}`)

        this.switchService = new hap.Service.Switch(this.myConfig.name);
        
        this.switchService
            .getCharacteristic(hap.Characteristic.On)
                .on(CharacteristicEventTypes.GET, this.getOnHandler.bind(this))
                .on(CharacteristicEventTypes.SET, this.setOnHandler.bind(this))
        ;

        this.switchService.getCharacteristic(hap.CharacteristicEventTypes.GET)?.getValue()

        this.infoService = new hap.Service.AccessoryInformation()
            .setCharacteristic(hap.Characteristic.Manufacturer, this.myConfig.maker)
            .setCharacteristic(hap.Characteristic.Model, this.myConfig.model);

        this.log.info(`Switch ${this.myConfig.name} has been created`);
    }

    private getOnHandler(callback: CharacteristicGetCallback) {
        try {
            this.getSwitchValue()
            callback(undefined, this.switchOn);
        }
        catch (error) {
            callback(error, this.switchOn);
        }
    }

    private getSwitchValue(): boolean {
        this.requestUrl(this.myConfig.getPin())
            .then((body: string) => {
                this.switchOn = (body == '["1"]');
                // this.log.debug(`the switch is ${this.switchOn} as body is ${body}`)
                return true;
            })
            .catch((error) => {
                this.log.warn(`request for status failed: ${error}`);
                this.log.warn(`${this.myConfig.getPin()}`);
                throw error;
        });
        
        return false;
    }

    private setOnHandler(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.switchOn = value as boolean;
        this.requestUrl(this.myConfig.setPin(this.switchOn))
            .then((body: string) => {
                callback();
            })
            .catch((error) => {
                this.log.warn(`Unable to set ${this.name}: ${error.message}`);
            });
    }
    
    private async requestUrl(url: string): Promise<string> {
        try {
            let response = await this.got(url);
            return response.body;
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * Method to refresh the accessory status
     */
    getStatus(): void {
        try {
            let onCharacter = this.switchService.getCharacteristic(this.hap.Characteristic.On)
            onCharacter.getValue();
            onCharacter.updateValue( this.switchOn );
        }
        catch (error) {
            this.log.warn(`problem refresh state: ${error}`)
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