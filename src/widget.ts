import {
    Logging,
} from "homebridge"


export interface IBlynkWidget {
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

export abstract class BlynkWidgetBase {
    protected readonly log:         Logging;
    protected readonly baseUrl:     string;
    protected id:                   number;
    protected name:                 string;
    protected manufacturer:         string;
    protected model:                string;
    protected widgetType:           string;
    protected pinType:              string;
    protected pinNumber:            number;
    protected pinUrlLabel:          string;
    protected pinLabel:             string;

    constructor(log: Logging, baseUrl: string, widget: Record<string, string | number>) {
        this.log        = log;
        this.baseUrl    = baseUrl;

        this.id             = widget['id']              as number   ?? 0;
        this.name           = widget['name']            as string   ?? "Wojstead Button"
        this.manufacturer   = widget['manufacturer']    as string   ?? "WojStead";
        this.widgetType     = widget['type']            as string   ?? "BUTTON";
        this.pinType        = widget['pintype']         as string   ?? "VIRUTAL";
        this.pinNumber      = widget['pinnumber']       as number   ?? 0;
        this.pinLabel       = widget['label']           as string   ?? "missing label here...."
        this.model          = widget['model']           as string   ?? this.pinLabel;
        this.pinUrlLabel    = (this.pinType.toLowerCase() === 'virtual')
                                    ? `V${this.pinNumber}`
                                    : `D${this.pinNumber}`
    }

    getId():            number { return this.id; }
    getName():          string { return this.name; }
    getManufacturer():  string { return this.manufacturer; }
    getModel():         string { return this.model; }
    getWidgetType():    string { return this.widgetType; }
    getPinType():       string { return this.pinType; }
    getPinNumber():     number { return this.pinNumber; }
    getPinLabel():      string { return this.pinLabel; }

    getPin():           string { return `${this.baseUrl}/get/${this.pinUrlLabel}`; }

    // Blynk server URL to set new value for the pin
    abstract setPin():      string;
    abstract setValue(value:string): void;

    abstract getValue():    number;
    abstract getMin():      number;
    abstract getMax():      number;

    private readonly got = require('got');

    protected async requestUrl(url: string): Promise<string> {
        const options = {
            dnsCache: true,
            retry: {
                limit: 5
            }
        }

        try {
            const response = await this.got(url, options);
            return response.body;
        } catch (error) {
            this.log.error(`acc requestUrl: ${error}`);
            return "[0]";
        }
    }

    toString(): string {
        return `${this.manufacturer} made a ${this.widgetType} named ${this.pinLabel} on pin ${this.pinUrlLabel}`;
    }
}

export class BlynkWidgetButton extends BlynkWidgetBase {
    private readonly SWITCH_ON:     string = '["1"]';
    private readonly SWITCH_OFF:    string = '["0"]';

    protected minValue:       number;
    protected maxValue:       number;
    private curValue:       number;

    constructor(log: Logging, baseUrl: string, widget: Record<string, string | number>) {
        super(log, baseUrl, widget);
        this.minValue   = widget['min']     as number   ?? 0.0;
        this.maxValue   = widget['max']     as number   ?? 1.0;
        this.curValue   = widget['value']   as number   ?? 0;
    }

    setPin(): string {
        return `${this.baseUrl}/update/${this.pinUrlLabel}?value=${this.curValue}`;
    }
    setValue(value: string): void {
        this.curValue = (value === 'true') ? 1 : 0;

        super.requestUrl(this.setPin());

        this.log.warn(`value: ${value} | curValue; ${this.curValue}`);
    }
    getValue(): number  {
        try {
            super.requestUrl(this.getPin())
                .then((body) => {
                    const valueJson = JSON.parse(body);
                    this.curValue = valueJson[0];
            });
        }
        catch (error) {
            this.log.error(`failed on: ${error}`);
        }

        if (this.getPinNumber() === 0) {
            this.log.error(`current button value: ${this.curValue}`);
        }

        return this.curValue;
    }
    getMin():   number  { return this.minValue; }
    getMax():   number  { return this.maxValue; }

    toString(): string { return super.toString(); }
}

export class BlynkWidgetDimmer extends BlynkWidgetBase {
    private dimmerLow       = 0;
    private dimmerHigh      = 100;
    private dimmerCur       = 0;

    constructor(log: Logging, baseUrl: string, widget: Record<string, string | number>) {
        super(log, baseUrl, widget);
        this.dimmerLow   = widget['min']     as number   ?? 0.0;
        this.dimmerHigh  = widget['max']     as number   ?? 100.0;
        this.dimmerCur   = widget['value']   as number   ?? 0;
    }

    getValue(): number  {
        try {
            super.requestUrl(this.getPin())
                .then((body) => {
                    const valueJson = JSON.parse(body);
                    this.dimmerCur = valueJson[0];
                }
            );
        }
        catch (error) {
            this.log.error(`Dimmer get failed: ${error}`)
        }
        return this.dimmerCur;
    }

    getMin():   number  { return this.dimmerLow; }
    getMax():   number  { return this.dimmerHigh; }

    setPin(): string {
        return `${this.baseUrl}/update/${this.pinUrlLabel}?value=${+this.dimmerCur}`;
    }

    setValue(value: string): void {
        // handle on/off case
        const tempJsonInput = (value === "true" || value === "false")
            ? `["${(value === "true") ? this.dimmerHigh : this.dimmerLow }"]`
            : value;

        const valueJson = JSON.parse(tempJsonInput);
        const tempValue: number  = +valueJson[0];

        if (tempValue > this.dimmerHigh) {
            this.dimmerCur = this.dimmerHigh;
        }
        else if (tempValue < this.dimmerLow) {
            this.dimmerCur = this.dimmerLow;
        }
        else {
            this.dimmerCur = tempValue;
        }

        super.requestUrl(this.setPin());
        this.log.error(`new dimmer value: ${tempValue} from ${value}  --> ${this.dimmerCur}`);
    }

    setDimmerLow(value: number): void {
        this.dimmerLow = value;
    }

    setDimmerHigh(value: number): void {
        this.dimmerHigh = value;
    }

    toString(): string { return super.toString(); }
}
