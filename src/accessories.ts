import {
    CharacteristicEventTypes, 
    CharacteristicGetCallback, 
    CharacteristicSetCallback,
    CharacteristicValue, 
    HAP, 
    Logging, 
    PlatformAccessory,
    Service, 
} from "homebridge";

import { BlynkWidgetBase } from "./widget"

export class BlynkAccessory {
    private readonly log: Logging;
    private readonly hap: HAP;
    private switchService?: Service;
    private infoService?: Service;
    private accessory?: PlatformAccessory;

    private readonly got = require('got');

    private myConfig: BlynkWidgetBase;

    name: string

    constructor(hap: HAP, log: Logging, config: BlynkWidgetBase) {
        this.hap = hap;
        this.log = log;
        this.myConfig = config;
        this.name = this.myConfig.getName();

        this.log.debug(`Switch ${this.name} has been created`);
    }

    attachAccessory(accessory: PlatformAccessory) {
        this.accessory = accessory;

        this.accessory.displayName = this.name;

        this.switchService = this.accessory.getService(this.hap.Service.Switch) 
            ?? this.accessory.addService(this.hap.Service.Switch);
        this.switchService
            .getCharacteristic(this.hap.Characteristic.On)
                .on(CharacteristicEventTypes.GET, this.getOnHandler.bind(this))
                .on(CharacteristicEventTypes.SET, this.setOnHandler.bind(this))
        ;

        this.switchService.getCharacteristic(this.hap.CharacteristicEventTypes.GET)?.getValue()

        this.infoService = accessory.getService(this.hap.Service.AccessoryInformation) 
            ?? this.accessory.addService(this.hap.Service.AccessoryInformation);

        this.infoService
            .setCharacteristic(this.hap.Characteristic.SerialNumber, this.accessory.UUID)
            .setCharacteristic(this.hap.Characteristic.Manufacturer, this.myConfig.getManufacturer())
            .setCharacteristic(this.hap.Characteristic.Model, this.myConfig.getModel());

        this.log.debug(`Switch ${this.name} has been attached`);
    }

    getOnHandler(callback: CharacteristicGetCallback) {
        try {
            this.getSwitchValue()
            callback(undefined, this.myConfig.getValue());
        }
        catch (error) {
            callback(error, this.myConfig.getValue());
        }
    }

    private getSwitchValue(): boolean {
        this.requestUrl(this.myConfig.getPin())
            .then((body: string) => {
                this.myConfig.setValue(body);
                return true;
            })
            .catch((error) => {
                this.log.warn(`request for status failed: ${error}`);
                this.log.warn(`${this.myConfig.getPin()}`);
                throw error;
        });
        
        return false;
    }

    setOnHandler(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.myConfig.setValue(value.toString());
        this.log.info(this.myConfig.setPin());
        this.requestUrl(this.myConfig.setPin())
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
            let onCharacter = this.switchService?.getCharacteristic(this.hap.Characteristic.On)
            if (!onCharacter) { throw new Error(`Service missing on ${this.name}`)}
            onCharacter.getValue();
            onCharacter.updateValue( this.myConfig.getValue() );
        }
        catch (error) {
            this.log.warn(`problem refresh state: ${error}`)
        }
    }

    /*
    -- AccessoryPlugin implementation
    identify(): void {
        this.log(`Identify yourself ${this.myConfig.getName()}`);
    }

    getServices(): Service[] {
        return [
            this.infoService,
            this.switchService
        ];
    }
    */
}