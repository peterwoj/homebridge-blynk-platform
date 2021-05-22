import {
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
    private accessoryService?: Service;
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

    attachAccessory(accessory: PlatformAccessory): void {
        this.accessory = accessory;

        this.accessory.displayName = this.name;

        let serviceType = this.hap.Service.Switch;
        if (this.myConfig.getWidgetType() === "SLIDER") {
            serviceType = this.hap.Service.Lightbulb;
        }

        this.accessoryService = this.accessory.getService(serviceType)
            ?? this.accessory.addService(serviceType);

        this.accessoryService
            .getCharacteristic(this.hap.Characteristic.On)
                .onGet(this.getOnHandler.bind(this))
                .onSet(this.setOnHandler.bind(this));

        if (this.myConfig.getWidgetType() === "SLIDER") {
            this.accessoryService
                .getCharacteristic(this.hap.Characteristic.Brightness)
                    .onGet(this.getBrightnessHandler.bind(this))
                    .onSet(this.setBrightnessHandler.bind(this));

        }

        this.accessoryService.getCharacteristic(this.hap.CharacteristicEventTypes.GET)?.getValue()

        this.infoService = accessory.getService(this.hap.Service.AccessoryInformation)
            ?? this.accessory.addService(this.hap.Service.AccessoryInformation);

        this.infoService
            .setCharacteristic(this.hap.Characteristic.SerialNumber, this.accessory.UUID)
            .setCharacteristic(this.hap.Characteristic.Manufacturer, this.myConfig.getManufacturer())
            .setCharacteristic(this.hap.Characteristic.Model, this.myConfig.getModel());

        this.log.debug(`Switch ${this.name} has been attached`);
    }

    getBrightnessHandler(): number {
        return this.myConfig.getValue();
    }

    setBrightnessHandler(value: CharacteristicValue): void {
        this.myConfig.setValue(`["${value.toString()}"]`);
    }

    getOnHandler(): boolean {
        return this.myConfig.getValue() > 0.1;
    }

    // value: either true or false based on setting of the widget in homebridge
    setOnHandler(value: CharacteristicValue): void {
        this.myConfig.setValue(value.toString());
    }

    /**
     * Method to refresh the accessory status
     */
    getStatus(): void {
        try {
            const onCharacter = this.accessoryService?.getCharacteristic(this.hap.Characteristic.On)
            if (!onCharacter) { throw new Error(`Service missing on ${this.name}`)}

            onCharacter.updateValue( this.myConfig.getValue() > 0.1 );

            if (this.myConfig.getWidgetType() === "SLIDER") {
                const bright = this.accessoryService?.getCharacteristic(this.hap.Characteristic.Brightness)
                if (bright) {
                    this.log.info(`bright(${this.myConfig.getValue()}) on ${this.myConfig.getName()}`);
                    bright.updateValue( this.myConfig.getValue() );
                }
            }
        }
        catch (error) {
            this.log.warn(`problem refresh state: ${error}`)
        }
    }
}