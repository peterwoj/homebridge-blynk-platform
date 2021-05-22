# homebridge-blynk-platform

Plugin for Homebridge to allow Blynk applications to be controlled throug Apple HomeKit.

<div style="text-align:center;">
<a href="https://www.npmjs.com/package/homebridge-blynk-platform"><img title="npm version" src="https://badgen.net/npm/v/homebridge-blynk-platform" /></a>
<a href="https://www.npmjs.com/package/homebridge-blynk-platform"><img title="npm downloads" src="https://badgen.net/npm/dt/homebridge-blynk-platform" /></a>
</div>

## Installation

Once you have a working [homebridge](https://github.com/homebridge/homebridge/)

```console
sudo npm install -g homebridge-blynk-platform
```

## Configuration

To expose your Blynk powered devices you have to configure the Homebridge to the location of your Blynk server.

```json
    "platforms": {
        "platform": "BlynkPlatform",
        "serverurl": "http://your.blynkserver.com:8080",
        "pollerseconds": "20",
        "devices": [
            {
                "manufacturer": "PeterWoj",
                "name": "HabitController",
                "token": "1e6aa4f587664ed74c8195842d2f1a8d",
                "deviceId": "31225",
                "discover": true
            },
            {
                "manufacturer": "PeterWoj",
                "name": "OutdoorController",
                "token": "1e6aa4f587664ed74c8195842d2f1a8d",
                "deviceId": "112233",
                "discover": false,
                "accessories": [
                    {
                        "model": "extension-cord",
                        "name": "Pergola Lights",
                        "pintype": "VIRTUAL",
                        "pinnumber": 2,
                        "type": "BUTTON"
                    },
                    {
                        "model": "extension-dimmer",
                        "name": "Dimmed Lights",
                        "pintype": "VIRTUAL",
                        "pinnumber": 2,
                        "type": "SLIDER",
                        "min": 0,
                        "max": 100
                    }
                ]
            }
        ]
    },
```

Once your configuration is in place startup Homebridge and to get your devices connected to Apple HomeKit.

## Changelog

### 0.2.6

* Bug fixes 
 * #12 Missing 'D' from the digital pin requests 
 * #15 High CPU caused from failed config defaults for pollerseconds.
 * #14 Additional accessory types, SLIDER is now available

### 0.2.5

Bug fixes to account for discovery on a device which has multiple accessories associated with it.

* Bugs
  * Accessory discovery would fail to add found accessory due to duplicate UUID

### 0.2.4 ...

The 0.2.3 release...

### 0.2.3 Lint This

The fine folks created a linter, so it is good to use one.

### 0.2.2 The Burned Version

CI killed the version number, really I think it would be my fault.

### 0.2.1 Project Discovery

Enable fetching from the Blynk application to configure accessories.  For a device the parameter `discover` was added to let the Platform know if it should discover available devices are read the configuration file.  If `{ "discover": true }` is found then the `accessories` are ignored if defined.  If there is a change in settings from `discover` being set to false from true, the accessoriesCache will need to be manually updated to avoid item duplication.

Addition of config.schema.json to allow for easier configuration through homebridge-config-ui-x.

### 0.2.0 Breakin' Configs

Inlude a way to update the HomeKit if the switch state is changed with the Blynk application.

Format the configuration to allow an application to have multiple attached devices.  Each attached device can be configured with multiple functions, provided each function is a switch.

### 0.1.0 Get it runnin'

Initial release with limited device support, only for switches.  Supports only a single device attached to the Blynk application but can have multiple functions on the single device.
