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
            "token":         "auth token for the controller",
            "pollerseconds": "10",
            "accessories": [
                {
                    "name":      "Switch name",
                    "pintype":   "Virtual",
                    "pinnumber": 1
                }
            ]
        }
    ]
}
```

Once your configuration is in place startup Homebridge and to get your devices connected to Apple HomeKit.