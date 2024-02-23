import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url';
import { Gpio } from 'onoff';
import express from 'express'
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit'
import http from 'http'
import dotenv from 'dotenv'
dotenv.config()

const unlockRouter = new Router()

const expressApp = express()
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
console.log(contentPath);
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
}
app.disableHardwareAcceleration()
app.whenReady().then(() => {
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
    psk: process.env.DELIDOCK_BOX_PSK ?? ''
  })
})
