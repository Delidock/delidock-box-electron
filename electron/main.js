import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url';
import { Gpio } from 'onoff';
import express from 'express'
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit'
import http from 'http'
import dotenv from 'dotenv'
import wifi from 'node-wifi'
import { execSync } from 'child_process';
import bodyParser from 'body-parser'
dotenv.config()

const unlockRouter = new Router()

const expressApp = express()
const expressAppSetup = express()
const server = http.createServer(expressApp)
const expressPort = 3030

unlockRouter.use(rateLimit({
  windowMs: 3000,
  limit: 1
}))

expressApp.use('/gpio/unlock', unlockRouter)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let contentPath = path.join(__dirname, '..', 'build/index.html')
const createWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 480,
      titleBarStyle: 'hidden', //hidden title bar = boraderless window 
      fullscreen: true
    })
    win.loadFile(contentPath)

    //EDIT THIS IN CASE OF NEEDED
    win.closable = false //user unclosable
    win.menuBarVisible = false //invisible menu bar
    
    win.setResizable(false) //user unresizable
    win.openDevTools()
}

let instantSetupOption = false
const setupButton = new Gpio(16, 'in')
app.disableHardwareAcceleration()
app.whenReady().then(() => {
  if (setupButton.readSync()) {
    instantSetupOption = true
  }
  createWindow()
  server.listen(expressPort, '127.0.0.1');
})

const reed = new Gpio(17, 'in')
const lock = new Gpio(18, 'high')


unlockRouter.get('/', (req, res) => {
  try {
    lock.writeSync(0)
    setTimeout(() => {
      lock.writeSync(1)
    }, 1000)
    res.status(200).send('Door unlocked');
  } catch (error) {
    console.log(error);
  }
})

expressApp.get('/gpio/reed', (req, res) => {
  try {
    if (reed.readSync()) {
      res.status(200).send('Door is open');
    } else {
      res.status(201).send('Door is closed');
    }
  } catch (error) {
    console.log(error);
  }
})

expressApp.get('/config', (req, res) => {
  res.send({
    api: process.env.DELIDOCK_API_URL ?? '',
    livekitUrl: process.env.DELIDOCK_LIVEKIT_URL ?? '',
    boxId: process.env.DELIDOCK_BOX_ID ?? '',
    psk: process.env.DELIDOCK_BOX_PSK ?? '',
    instantSetup: instantSetupOption
  })
})

wifi.init({
  iface: null
})
expressApp.get('/network', (req, res)=>{
  wifi.getCurrentConnections((err, networks)=>{
    if (networks.length > 0) {
      res.status(200).send(networks[0].bssid)  
    } else {
      res.status(201).send('No network found')
    }
  })
})

expressApp.get('/kill/setup', (req, res)=>{
  try {
    if (execSync('ifconfig').toString().includes('ap0:')) {
      execSync(`psudo create_ap --stop ${process.env.WIFI_IF ?? 'wlo1'}`)
      setTimeout(() => {
        setupServer.close()
      }, 5000);
      res.status(200).send()
    }
    res.status(201).send()
  } catch (error) {
    console.log(error);
    res.status(404).send()
  }
})

let setupServer = http.createServer(expressAppSetup)
expressAppSetup.use(bodyParser.json())

expressApp.get('/network/setup/start', (req, res)=>{
  try {
    if(setupButton.readSync()){
    //if(true){
      setupServer.listen(3031)
      wifi.getCurrentConnections((err, networks)=>{
        if (!err && networks.length > 0) {
          wifi.deleteConnection({ssid: networks[0].ssid})
        }
        console.log(execSync(`nmcli device disconnect wlo1; sudo create_ap --daemon -n -g 1.0.0.1 ${process.env.WIFI_IF ?? 'wlo1'} DELIDOCK_SETUP`).toString())
        res.status(200).send()
      })
    } else {
      res.status(401).send()
    }
  } catch (error) {
    console.log(error);
  }
})

expressAppSetup.post('/network/setup/connect', async (req,res)=>{
  try {
    const wifiMessage = execSync(`nmcli device wifi connect "${req.body.ssid}" password '${req.body.password}'`).toString()
    if (wifiMessage.includes('successfully activated')) {
      const internetCheck = await fetch('https://www.google.com')
      if (internetCheck.status == 200) {
        res.status(200).send('OK')
      } else {
        res.status(201).send('No internet')
      }
    }else {
      res.status(400).send('Not connected') 
    }
  } catch (error) {
    res.status(404).send('Ouch') 
  }
})