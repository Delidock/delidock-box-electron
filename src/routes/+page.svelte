<script lang="ts">
    import BackspaceIcon from '$lib/assets/icons/BackspaceIcon.svelte';
	import UnlockIcon from '$lib/assets/icons/UnlockIcon.svelte';
    import { Room } from 'livekit-client'
	import { onMount } from 'svelte';
    import { io } from "socket.io-client";
    import QRCode from 'qrcode';

    let api : string
    let livekitUrl : string
    let boxId : string
    let psk : string
    const unlockDoors = () => {
        fetch('http://localhost:3030/gpio/unlock')
    }

    const checkDoors = async (token : string) => {
        const res = await fetch('http://localhost:3030/gpio/reed')
        if (res.status === 200) {
            if (doorsOpened != true) {
                doorsOpened = true
                fetch(api+'/status/unlocked', {
                    headers: {
                        Authorization: "Bearer "+token
                    }
                })
            }
        } else if (res.status === 201) {
            if (doorsOpened != false) {
                doorsOpened = false
                fetch(api+'/status/closed', {
                    headers: {
                        Authorization: "Bearer "+token
                    }
                })
            }
        }
    }

    const showQr = (id:string) => {
        function generateRandomString() {
            var result = '';
            var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            var charactersLength = characters.length;
            for (var i = 0; i < 8; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        activationGenerated = generateRandomString()
        QRCode.toCanvas(canvasElement, `${id}:${activationGenerated}`, {
            width: 300,
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            margin: 1
        })
    }

    const connectToLivekit = (jwtToken:string) => {
        fetch(api+"/status/getLivekit", {
            headers: {
                Authorization: "Bearer "+jwtToken
            }
        }).then(async (res) => {

            const livekitToken = await res.text()
            const room = new Room({
                publishDefaults: {
                    simulcast: false,
                },
                adaptiveStream: false,
                dynacast: false,
                videoCaptureDefaults: {
                    resolution: {
                        width: 1440,
                        height: 1080
                    }
                }
            })
            
            await room.prepareConnection(livekitUrl, livekitToken)
            await room.connect(livekitUrl, livekitToken)

            room.localParticipant.setCameraEnabled(true)
            
        })
    }

    onMount(() => {
        try {
            fetch('http://localhost:3030/config').then((res) => {
            res.json().then((data) => {
               api = data.api
               livekitUrl = data.livekitUrl
               boxId = data.boxId
               psk = data.psk

               if (!api || !livekitUrl || !boxId || !psk) {
                    loading = false
                    showError = "Something is missing :("
                    return
                }

                fetch(api+"/status/login", {
                    method: "POST",
                    headers: {Accept: '*/*', 'Content-Type': 'application/json'},
                    body: JSON.stringify({id: boxId, psk})
                }).then(async (res) => {
                    
                    const token = await res.text()
                
                    const socket = io(api+"/ws/boxes", {
                        auth: {
                            token: token
                        }
                    });

                    socket.on("initialized", (data) => {
                        activation = false
                        correctPin = data.pin.toString()
                        boxName = data.name
                        connectToLivekit(token)
                        loading = false
                    })

                    socket.on("activation", () => {
                        activation = true
                        showQr(boxId)
                        loading = false
                    })
                    
                    socket.on("activate", async (userId, generated) => {   
                        let status : number
                        if (generated === activationGenerated) {
                            status = 0
                        } else {
                            status = 1
                        }
                        const res = await fetch(api+"/status/activate", {
                            method: "POST",
                            headers: {
                                'Content-Type': "application/json",
                                Authorization: "Bearer "+token
                            },
                            body: JSON.stringify({userId, status})
                        })

                        if (res.status === 200 && status === 0) {
                            const awaitedJson = await res.json()    
                            boxName = awaitedJson.name
                            correctPin = awaitedJson.pin
                            connectToLivekit(token)
                            activation = false
                        }
                    })

                    socket.on("change",() => {
                        const randomNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                        correctPin = randomNumber
                        fetch(api+"/status/changed", {
                            method: "PUT",
                            headers: {
                                'Content-Type': "application/json",
                                Authorization: "Bearer "+token
                            },
                            body: JSON.stringify({newPin: randomNumber})
                        })
                    })

                    socket.on("unlock",() => {
                        unlockDoors()
                    })

                    socket.on("nameSet", (name) => {
                        boxName = name
                    })

                    setInterval(() => {
                        checkDoors(token)
                    }, 700)
                })
            })
        })
        } catch (error) {
            console.log(error);
            
        }
    })

    let pinValue : string = ""
    let correctPin : string
    
    let boxName : string = "Delidock good boy"

    let pinInvalidNotifier : boolean
    let pinCorrectNotifier : boolean
    let message : string = "Enter the PIN"
    let doorsOpened : boolean
    let loading : boolean = true
    let activation : boolean = false
    let activationGenerated : string
    let showError : string

    let canvasElement : HTMLCanvasElement

    let keypad = [7,8,9,4,5,6,1,2,3]

    const typePinNumber = (number : string) => {
        resetState()
        if (pinValue.length < 6) {
            pinValue = pinValue + number
        }
    }

    const backspace = () => {
        keypadClick("backspace")
        resetState()
        pinValue = pinValue.slice(0, -1)
    }

    const submitPin = () => {
        if (pinValue === correctPin) {
            pinInvalidNotifier = false
            pinCorrectNotifier = true
            pinValue = ""
            message = "PIN correct"
            unlockDoors()
            window.setTimeout(()=>resetState(), 1000)
        } else {
            pinInvalidNotifier = true
            pinCorrectNotifier = false
            pinValue = ""
            message = "PIN incorrect"
            window.setTimeout(()=>resetState(), 1000)
        }
    }

    const resetState = () => {
        message = "Enter the PIN"
        pinInvalidNotifier = false
        pinCorrectNotifier = false
    }

    const keypadKeysHover : {[key: string]: boolean} = {
        "1": false,
        "2": false,
        "3": false,
        "4": false,
        "5": false,
        "6": false,
        "7": false,
        "8": false,
        "9": false,
        "enter":false,
        "backpsace":false
    }

    const keypadClick = (key: string) => {
        keypadKeysHover[key] = true
        if (key != "enter" && key != "backspace") {
            typePinNumber(key)
        }
        setTimeout(() => {
            keypadKeysHover[key] = false
        }, 100)
    }
</script>
<svelte:head>
    <title>Delidock</title>
</svelte:head>
<main class="flex flex-row h-full w-full relative">
    {#if loading}
        <div class="top-0 left-0 bg-background w-screen h-screen absolute z-10 flex justify-center items-center flex-col gap-2">
            <img src="images/doggo.svg" class="w-32" alt="">
            <p>Your good boy is loading...</p>
        </div>
    {/if}
    {#if showError}
        <div class="top-0 left-0 bg-background w-screen h-screen absolute z-10 flex justify-center items-center">
            <p>{showError}</p>
        </div>
    {/if}
    <div class:!flex={activation} class="hidden top-0 left-0 bg-background w-screen h-screen absolute z-20 justify-center items-center flex-row gap-2 p-4">
        <div class="w-1/2 h-full flex flex-col">
            <p class="w-full">To activate this <span class="italic font-bold">puppy</span> open the Delidock on your app and on the home screen click on the + sign to start the activation proccess, then you can scan this QRcode, or enter the credentials manually.</p>
            <br>
            <p class="text-lg">Identity: <span class="font-bold">{boxId}</span></p>
            <p class="text-lg">Token: <span class="font-bold">{activationGenerated}</span></p>
            <br>
            <div class="w-full h-full flex justify-start items-end">
                <img class="h-16" src="images/doggo.svg" alt="">
            </div>
        </div>
        <div class="w-1/2 h-full flex justify-center items-center">
            <canvas bind:this={canvasElement}></canvas>
        </div>
    </div>
    <section class=" w-2/5 h-full flex flex-col p-2 py-4 border-2 border-btn_secondary">
        <p class="w-full text-2xl text-center">{boxName}</p>
        <div class="w-full flex justify-center items-center h-full">
            <img src="images/doggo.svg" class="w-2/3" alt="">
        </div>
    </section>
    <form on:submit|preventDefault={() => submitPin()} class="bg-background w-3/5 h-full flex flex-col gap-2 p-2">
        <div class="w-full h-1/4">
            <div class="relative transition-colors ease-in-out w-full h-full bg-secondary border-2 border-btn_secondary rounded-lg text-text_color text-base flex-row flex px-3 items-center gap-3" class:border-red={pinInvalidNotifier} class:border-green={pinCorrectNotifier}>
                {#if pinValue.length === 0}
                    <div class="left-0 top-0 absolute w-full h-full flex justify-center items-center">
                        <p>{message}</p>
                    </div>  
                {/if}
                <input class="w-full h-full bg-secondary outline-none text-center text-5xl" name="pin" bind:value={pinValue} disabled type="password">
            </div>
        </div>
        <div class="w-full h-full justify-center items-center">
            <div class="grid grid-cols-3 gap-2 h-full">
                {#each keypad as key}
                    <button type="button" on:click={() => keypadClick(key.toString())} class="text-2xl flex justify-center items-center bg-btn_secondary rounded-lg w-full h-full solid-shadow active:bg-btn_pressed active:scale-95 transition-all"  class:!bg-btn_pressed={keypadKeysHover[key]} class:scale-95={keypadKeysHover[key]}>
                        <p>{key}</p>
                    </button>
                {/each}
                <button type="button" on:click={() => backspace()} class="text-xl flex justify-center items-center bg-red red-shadow active:bg-[#892A35] rounded-lg w-full active:scale-95 transition-all" class:!bg-[#892A35]={keypadKeysHover["backspace"]} class:scale-95={keypadKeysHover["backspace"]}>
                    <BackspaceIcon/>
                </button>
                <button type="button" on:click={() => keypadClick("0")}  class="text-2xl flex justify-center items-center bg-btn_secondary rounded-lg w-full solid-shadow active:bg-btn_pressed active:scale-95 transition-all" class:!bg-btn_pressed={keypadKeysHover["0"]} class:scale-95={keypadKeysHover["0"]}>
                    <p>0</p>
                </button>
                <button type="submit" on:click={()=> keypadClick("enter")} class="text-xl flex justify-center items-center bg-green rounded-lg w-full green-shadow active:bg-[#358153] active:scale-95 transition-all" class:!bg-[#358153]={keypadKeysHover["enter"]} class:scale-95={keypadKeysHover["enter"]}>
                    <UnlockIcon/>
                </button>
            </div>
        </div>
    </form>
</main>
<style>
    .solid-shadow {
        box-shadow: 0px 4px 0px 0px rgba(22, 22, 48, 0.61);
    }
    .red-shadow {
        box-shadow: 0px 4px 0px 0px rgba(207, 58, 75, 0.25);
    }
    .green-shadow {
        box-shadow: 0px 4px 0px 0px rgba(86, 224, 141, 0.25);
    }
</style>
