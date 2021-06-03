import {
    Characteristic,
    CharacteristicValue,
    HAP,
    Logging,
    PlatformAccessory,
    Service,
} from "homebridge";

import { BlynkWidgetBase } from "./widget"

export enum HOMEKIT_TYPES {
    // BATTERY,
    // C0_SENSOR           = "C0_SENSOR",
    // C02_SENSOR          = "C02_SENSOR",
    // CONTACT_SENSOR      = "CONTACT_SENSOR",
    HUMIDITY_SENSOR     = "HUMIDITY_SENSOR",
    // LEAK_SENSOR         = "LEAK_SENSOR",
    LIGHTBULB           = "LIGHTBULB",
    // MOTION_SENSOR       = "MOTION_SENSOR",
    // OCCUPANCY_SENSOR    = "OCCUPANCY_SENSOR",
    OUTLET              = "OUTLET",
    // SMOKE_SENSOR        = "SMOKE_SENSOR",
    TEMPERATURE_SENSOR  = "TEMPERATURE_SENSOR",
    UNDEFINED           = "UNDEFINED"
}

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

    // private bindSensor(service: Service | typeof Service, characteristic: CharacteristicValue): boolean {
    //     if (this.accessory) {
    //         this.accessoryService = this.accessory.getService(service)
    //             ?? this.accessory?.addService(service);
    //         this.accessoryService
    //             .getCharacteristic(characteristic)
    //                 .onGet(this.getBrightnessHandler.bind(this));
    //         return true;
    //     }
    //     else {
    //         return false;
    //     }
    // }

    // Determine accessory service from Blynk widget type
    // can be overridden with "homekitType" to match a HomeKit
    // type instead.
    attachAccessory(accessory: PlatformAccessory): void {
        this.accessory = accessory;
        this.accessory.displayName = this.name;
        const typeOf: HOMEKIT_TYPES    = this.myConfig.getTypeOf();
        let serviceType = this.hap.Service.Lightbulb;

        this.log.info(`${this.myConfig.getName()} is a ${typeOf}`);


        switch (typeOf) {
            case HOMEKIT_TYPES.OUTLET:
                serviceType = this.hap.Service.Outlet;
                this.accessoryService = this.accessory.getService(this.hap.Service.Lightbulb)
                    ?? this.accessory.addService(serviceType);

                this.accessoryService
                    .getCharacteristic(this.hap.Characteristic.On)
                        .onGet(this.getOnHandler.bind(this))
                        .onSet(this.setOnHandler.bind(this));
                break;
            case HOMEKIT_TYPES.LIGHTBULB:
                serviceType = this.hap.Service.Lightbulb;
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
                break;
            case HOMEKIT_TYPES.HUMIDITY_SENSOR:
                serviceType = this.hap.Service.HumiditySensor;
                this.accessoryService = this.accessory.getService(serviceType)
                    ?? this.accessory.addService(serviceType);

                this.accessoryService
                    .getCharacteristic(this.hap.Characteristic.CurrentRelativeHumidity)
                        .onGet(this.getBrightnessHandler.bind(this));
                break;
            case HOMEKIT_TYPES.TEMPERATURE_SENSOR:
                serviceType = this.hap.Service.TemperatureSensor;
                this.accessoryService = this.accessory.getService(serviceType)
                    ?? this.accessory.addService(serviceType);

                this.accessoryService
                    .getCharacteristic(this.hap.Characteristic.TemperatureDisplayUnits)
                        .onGet(this.getTemperatureUnit.bind(this));

                this.log.info(`setting temperature sensor`);
                break;
            default:
                serviceType = this.hap.Service.Lightbulb;
                this.accessoryService = this.accessory.getService(serviceType)
                    ?? this.accessory.addService(serviceType);

                this.log.debug(`fall through case for attaching events`);
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
                break;
        }

        this.accessoryService.getCharacteristic(this.hap.CharacteristicEventTypes.GET)?.getValue()

        this.infoService = accessory.getService(this.hap.Service.AccessoryInformation)
            ?? this.accessory.addService(this.hap.Service.AccessoryInformation);

        this.infoService
            .setCharacteristic(this.hap.Characteristic.SerialNumber, this.accessory.UUID)
            .setCharacteristic(this.hap.Characteristic.Manufacturer, this.myConfig.getManufacturer())
            .setCharacteristic(this.hap.Characteristic.Model, this.myConfig.getModel());

        this.log.debug(`${this.myConfig.getTypeOf()} ${this.name} has been attached.`);
    }

    getTemperatureUnit(): CharacteristicValue {
        return this.hap.Characteristic.TemperatureDisplayUnits.CELSIUS;
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
                    // this.log.debug(`Dimmer(${this.myConfig.getName()}).brightness: ${this.myConfig.getValue()}`);
                    bright.updateValue( this.myConfig.getValue() );
                }
            }
        }
        catch (error) {
            this.log.warn(`problem refresh state: ${error}`)
        }
    }
}