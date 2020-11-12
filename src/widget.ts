import {
    Logging,
} from "homebridge"

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

    getPin():          string { return `${this.baseUrl}/get/${this.pinUrlLabel}`; }

    abstract setPin():      string;
    abstract setValue(value:string): void;

    abstract getValue():    number;
    abstract getMin():      number;
    abstract getMax():      number;

    toString(): string {
        return `${this.manufacturer} made a ${this.widgetType} named ${this.pinLabel} on pin ${this.pinUrlLabel}`;
    }
}

export class BlynkWidgetButton extends BlynkWidgetBase {
    private readonly SWITCH_ON:     string = '["1"]';
    private readonly SWITCH_OFF:    string = '["0"]';

    private minValue:       number;
    private maxValue:       number;
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
        if (value === "true") {
            value = this.SWITCH_ON;
        }
        else if (value === 'false') {
            value = this.SWITCH_OFF;
        }
        this.curValue = (value === this.SWITCH_ON) ? 1 : 0;
    }
    getValue(): number  { return this.curValue; }
    getMin():   number  { return this.minValue; }
    getMax():   number  { return this.maxValue; }

    toString(): string { return super.toString(); }
}
