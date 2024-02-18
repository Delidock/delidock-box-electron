# Delidock/box-client
Delidock's box client running on the box, written in Svelte, wrapped using Electron
## IMPORTANT!
This is designed for Rasspberry PI so it is utilizin GPIO
## Prerequisities
- `NodeJS` >= 20
### Configuration
- specify required **enviroment variables**:
    - **DELIDOCK_API_URL**="https://delidock-api.stepskop.xyz" - base url of Delidock API
    - **DELIDOCK_LIVEKIT_URL**="https://delidock-livekit.stepskop.xyz" - base url of Livekit server
    - **DELIDOCK_BOX_ID**="64a233a33kafdf6b2b542po0" - box specific unique ID
    - **DELIDOCK_BOX_PSK**="box-preshared-key" - box preshared key (like password)
<br><br>
- see `electron/main.js` for app window configuration, refer to [official Electron docs](https://www.electronjs.org/)
- see `electron/main.js` for GPIO configuration, refer to [onoff library docs](https://github.com/fivdi/onoff)
## Installing dependencies
```
npm i
```

## Building
```
npm run build
```
### Building - create executable
Build installable **.deb** package -> available only on Debian based distros, for building for other OS see [electron-pacakger](https://github.com/electron/packager) repo.
<br><br>
For arm CPU arch (Rasspberry PI) 

```bash
npm run deb:arm64 # for arm CPU arch (Rasspberry PI) 
```
For regular x86
```bash
npm run deb:amd64
```
Outputs are saved to `dist/installers`, from there you can run:
```bash
dpkg -i <name_of_the_package>
```
## Running
Installed package should be directly accessible via $PATH
```bash
delidock-box-client
```
Tip:
*Set this as automatic task when system starts*