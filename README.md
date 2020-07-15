# homebridge-blynk-platform

Plugin for Homebridge to allow Blynk applications to be controlled throug Apple HomeKit.

## Installation

Once you have a working [homebridge](https://github.com/homebridge/homebridge/)

```console
sudo npm install -g homebridge-blynk-platform
```

## Configuration

To expose your Blynk powered devices you have to configure the Homebridge to the location of your Blynk server.

```json
{
    "platforms": [
        {
            "platform":      "BlynkPlatform",
            "serverurl":     "http://your.blynkserver.com:8080",
            "pollerseconds": "10",
            "devices": [
                {
                    "name":         "SwitchPanel",
                    "token":        "auth token for the controller",
                    "manufacturer": "who made it",
                    "accessories": [
                        {
                            "model":     "Model Name",
                            "name":      "Switch name",
                            "pintype":   "Virtual",
                            "pinnumber": 1
                        }
                    ]
                }
            ],

        }
    ]
}
```

Once your configuration is in place startup Homebridge and to get your devices connected to Apple HomeKit.

## Changelog

### 0.2.0 Breakin' Configs

Inlude a way to update the HomeKit if the switch state is changed with the Blynk application.

Format the configuration to allow an application to have multiple attached devices.  Each attached device can be configured with multiple functions, provided each function is a switch.

### 0.1.0 Get it runnin'

Initial release with limited device support, only for switches.  Supports only a single device attached to the Blynk application but can have multiple functions on the single device.
