import { Boom } from '@hapi/boom'
import NodeCache from 'node-cache'
import readline from 'readline'
import makeWASocket, { AnyMessageContent, BinaryInfo, delay, DisconnectReason, downloadAndProcessHistorySyncNotification, encodeWAM, fetchLatestBaileysVersion, getAggregateVotesInPollMessage, getHistoryMsg, isJidNewsletter, makeCacheableSignalKeyStore, makeInMemoryStore, PHONENUMBER_MCC, proto, useMultiFileAuthState, WAMessageContent, WAMessageKey } from './src'
import open from 'open'
import fs from 'fs'
import P from 'pino'
import csv from 'csv'
import mime from 'mime-types'
import dotenv from 'dotenv'

dotenv.config();
const periodo= process.env.PERIODO
const rutasbase=process.env.RUTA
const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))


logger.level = 'trace'

const useStore = !process.argv.includes('--no-store')
const doReplies = process.argv.includes('--do-reply')
const usePairingCode = process.argv.includes('--use-pairing-code')
const useMobile = process.argv.includes('--mobile')

const results: string[] = [];
const row:never[] = []
const msgRetryCounterCache = new NodeCache()

const onDemandMap = new Map<string, string>()
let envioInciado=false


// Read line interface
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))
let filePath:string
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = useStore ? makeInMemoryStore({ logger }) : undefined
store?.readFromFile('./baileys_store_multi.json')
// save every 10s
setInterval(() => {
	store?.writeToFile('./baileys_store_multi.json')
}, 10_000)

// start a connection

envioInciado=false
const startSock = async() => {
	const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
	const { version, isLatest } = await fetchLatestBaileysVersion()
	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)



	const sock = makeWASocket({
		version,
		logger,
		printQRInTerminal: !usePairingCode,
		mobile: useMobile,
		auth: {
			creds: state.creds,
			/** caching makes the store faster to send/recv messages */
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		msgRetryCounterCache,
		generateHighQualityLinkPreview: true,
		// ignore all broadcast messages -- to receive the same
		// comment the line below out
		// shouldIgnoreJid: jid => isJidBroadcast(jid),
		// implement to handle retries & poll updates
		getMessage,
	})

	store?.bind(sock.ev)

	// Pairing code for Web clients
	if(usePairingCode && !sock.authState.creds.registered) {
		if(useMobile) {
			throw new Error('Cannot use pairing code with mobile api')
		}

		const phoneNumber = await question('Please enter your mobile phone number:\n')
		const code = await sock.requestPairingCode(phoneNumber)
		console.log(`Pairing code: ${code}`)
	}

	// If mobile was chosen, ask for the code
	if(useMobile && !sock.authState.creds.registered) {
		const { registration } = sock.authState.creds || { registration: {} }

		if(!registration.phoneNumber) {
			registration.phoneNumber = await question('Please enter your mobile phone number:\n')
		}

		const libPhonenumber = await import("libphonenumber-js")
		const phoneNumber = libPhonenumber.parsePhoneNumber(registration!.phoneNumber)
		if(!phoneNumber?.isValid()) {
			throw new Error('Invalid phone number: ' + registration!.phoneNumber)
		}

		registration.phoneNumber = phoneNumber.format('E.164')
		registration.phoneNumberCountryCode = phoneNumber.countryCallingCode
		registration.phoneNumberNationalNumber = phoneNumber.nationalNumber
		const mcc = PHONENUMBER_MCC[phoneNumber.countryCallingCode]
		if(!mcc) {
			throw new Error('Could not find MCC for phone number: ' + registration!.phoneNumber + '\nPlease specify the MCC manually.')
		}

		registration.phoneNumberMobileCountryCode = mcc

		async function enterCode() {
			try {
				const code = await question('Please enter the one time code:\n')
				const response = await sock.register(code.replace(/["']/g, '').trim().toLowerCase())
				console.log('Successfully registered your phone number.')
				console.log(response)
				rl.close()
			} catch(error) {
				console.error('Failed to register your phone number. Please try again.\n', error)
				await askForOTP()
			}
		}

		async function enterCaptcha() {
			const response = await sock.requestRegistrationCode({ ...registration, method: 'captcha' })
			const path = __dirname + '/captcha.png'
			fs.writeFileSync(path, Buffer.from(response.image_blob!, 'base64'))

			open(path)
			const code = await question('Please enter the captcha code:\n')
			fs.unlinkSync(path)
			registration.captcha = code.replace(/["']/g, '').trim().toLowerCase()
		}

		async function askForOTP() {
			if (!registration.method) {
				await delay(2000)
				let code = await question('How would you like to receive the one time code for registration? "sms" or "voice"\n')
				code = code.replace(/["']/g, '').trim().toLowerCase()
				if(code !== 'sms' && code !== 'voice') {
					return await askForOTP()
				}

				registration.method = code
			}

			try {
				await sock.requestRegistrationCode(registration)
				await enterCode()
			} catch(error) {
				console.error('Failed to request registration code. Please try again.\n', error)

				if(error?.reason === 'code_checkpoint') {
					await enterCaptcha()
				}

				await askForOTP()
			}
		}

		askForOTP()
	}
	const envioDeFacturas = async()=>{
		let rutaarchivo
		let cadedarf
		let facturas
		console.log("probando envio de facturas")
	
		for(let i=1;i<results.length;i++)
			{
				facturas=results[i][2].split(";")
				
				let nombre=results[i][0]
				let numero=results[i][1]
				let saludo:string="Hola "+nombre+", adjuntamos factura/s del periodo "+periodo+".COSEPAR LTDA"
				let numero_whats:string=numero+"@s.whatsapp.net"
				//enviar saludooo
				await delay(5000)
				await sendMessageWTyping({text:saludo},numero_whats)

				console.log("Envio Saludo a"+nombre+" al nuermo "+numero)
				
		for(let t=0;t<facturas.length;t++){
			if(facturas[t]!=null||facturas[t]!='')
			{
				cadedarf=obtenerStringFacturas(facturas[t])
				await delay(2000)
				rutaarchivo=rutasbase+"facturas/"+periodo+"/"+cadedarf+".pdf"	
				const mimeType = mime.lookup(filePath);
        		const fileName = rutaarchivo.split('/').pop();
       			 await sock.sendMessage(numero_whats, {
           			document: { url: rutaarchivo },
          		  	mimetype: mimeType,
           		 	fileName: fileName,
        			})
				console.log("Envio ficticio de archivo"+rutaarchivo) 
			}   			
		}
		}
	}
	const sendMessageWTyping = async(msg: AnyMessageContent, jid: string) => {
		await sock.presenceSubscribe(jid)
		await delay(100)

		await sock.sendPresenceUpdate('composing', jid)
		await delay(500)

		await sock.sendPresenceUpdate('paused', jid)

		await sock.sendMessage(jid, msg)
	}

	
	sock.ev.process(
		async(events) => {
			if(events['connection.update']) {
				const update = events['connection.update']
				const { connection, lastDisconnect } = update
				if(connection === 'close') {
					if((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
						startSock()
					} else {
						console.log('Connection closed. You are logged out.')
					}
				}
				
				
				const sendWAMExample = false;
				if(connection === 'open' && sendWAMExample) {
					/// sending WAM EXAMPLE
					const {
						header: {
							wamVersion,
							eventSequenceNumber,
						},
						events,
					} = JSON.parse(await fs.promises.readFile("./boot_analytics_test.json", "utf-8"))

					const binaryInfo = new BinaryInfo({
						protocolVersion: wamVersion,
						sequence: eventSequenceNumber,
						events: events
					})

					const buffer = encodeWAM(binaryInfo);
					
					const result = await sock.sendWAMBuffer(buffer)
					console.log(result)
				}

				console.log('connection update', update)
			}

			// credentials updated -- save them
			if(events['creds.update']) {
				await saveCreds()
			}

			if(events['labels.association']) {
				console.log(events['labels.association'])
			}


			if(events['labels.edit']) {
				console.log(events['labels.edit'])
			}

			if(events.call) {
				console.log('recv call event', events.call)
			}

			// history received
			if(events['messaging-history.set']) {
				const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set']
				if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
					console.log('received on-demand history sync, messages=', messages)
				}
				console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`)
			}

			// received a new message
			if(events['messages.upsert']) {
				const upsert = events['messages.upsert']
				//console.log('recv messages ', JSON.stringify(upsert, undefined, 2))

				if(upsert.type === 'notify') {
					for (const msg of upsert.messages) {
						
							if(!envioInciado){//cuando las notificaciones inicia el envio masivo de facturas
								
								envioDeFacturas()
								envioInciado=true;
							}


						if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
							const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
							if (text == "requestPlaceholder" && !upsert.requestId) {
								const messageId = await sock.requestPlaceholderResend(msg.key) 
								console.log('requested placeholder resync, id=', messageId)
							} else if (upsert.requestId) {
								console.log('Message received from phone, id=', upsert.requestId, msg)
							}

							// go to an old chat and send this
							if (text == "onDemandHistSync") {
								const messageId = await sock.fetchMessageHistory(50, msg.key, msg.messageTimestamp!) 
								console.log('requested on-demand sync, id=', messageId)
							}
						}

						if(!msg.key.fromMe && doReplies && !isJidNewsletter(msg.key?.remoteJid!)) {

							console.log('replying to', msg.key.remoteJid)
							await sock!.readMessages([msg.key])
							await sendMessageWTyping({ text: 'Hello there!' }, msg.key.remoteJid!)
						}
					}
				}
			}

			// messages updated like status delivered, message deleted etc.
			if(events['messages.update']) {
				console.log(
					JSON.stringify(events['messages.update'], undefined, 2)
				)

				for(const { key, update } of events['messages.update']) {
					if(update.pollUpdates) {
						const pollCreation = await getMessage(key)
						if(pollCreation) {
							console.log(
								'got poll update, aggregation: ',
								getAggregateVotesInPollMessage({
									message: pollCreation,
									pollUpdates: update.pollUpdates,
								})
							)
						}
					}
				}
			}

			if(events['message-receipt.update']) {
				console.log(events['message-receipt.update'])
			}

			if(events['messages.reaction']) {
				console.log(events['messages.reaction'])
			}

			if(events['presence.update']) {
				console.log(events['presence.update'])
			}

			if(events['chats.update']) {
				console.log(events['chats.update'])
			}

			if(events['contacts.update']) {
				for(const contact of events['contacts.update']) {
					if(typeof contact.imgUrl !== 'undefined') {
						const newUrl = contact.imgUrl === null
							? null
							: await sock!.profilePictureUrl(contact.id!).catch(() => null)
						console.log(
							`contact ${contact.id} has a new profile pic: ${newUrl}`,
						)
					}
				}
			}

			if(events['chats.delete']) {
				console.log('chats deleted ', events['chats.delete'])
			}
		}
	)

	return sock

	async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
		if(store) {
			const msg = await store.loadMessage(key.remoteJid!, key.id!)
			return msg?.message || undefined
		}

		// only if store is present
		return proto.Message.fromObject({})
	}
}


function existeArchivo(rutaarchivo){

    try{
    return fs.statSync(rutaarchivo).isFile();
  } catch (e) {
    return false;
  }
}


function buscarFallas(){
	let facturas: string[]
	let cadedarf:string
    let rutaarchivo:string
	let falla: boolean=false

	for(let i=1;i<results.length;i++)
        {
            facturas=results[i][2].split(";")
            
            let nombre=results[i][0]
            let numero=results[i][1]
		
            if(nombre=="")
            {
                console.log("El nombre se encuntre vacio")
				falla=true
            }   

            if(esNumeroDeTelefono(numero)){
                console.log("El numero "+numero+" de la persona "+nombre+" No parece un numero de telefono")
                
            }
            
    for(let t=0;t<facturas.length;t++){
        if(facturas[t]!=null||facturas[t]!='')
        {
        
            cadedarf=obtenerStringFacturas(facturas[t])
            
            rutaarchivo=rutasbase+"facturas/"+periodo+"/"+cadedarf+".pdf"
            if(!existeArchivo(rutaarchivo)){
                console.log("El archivo "+rutaarchivo+" de la persona "+nombre+" No existe")
                falla=true
            }
            
             
        }   
        
        
    }
    }
	return falla
}
function esNumeroDeTelefono(numero){
    const regex = /[0-9]{13,13}/;
    let res=true
    if(regex.test(numero))
        res=false

    return res
}
function obtenerStringFacturas(facturas){
    let rfsubf:string[]
	let cantdeceros:number
	//console.log("Aca"+facturas)
    rfsubf=facturas.split("-")
    let cadedarf=""
    cadedarf+="010"
    cadedarf+=rfsubf[0]
    cantdeceros=5-rfsubf[1].length;
    //si da error esta linea hay punto y coma de mas
    for(let e=0;e<cantdeceros;e++)
    cadedarf+="0"

    cadedarf+=rfsubf[1]
    cadedarf+=rfsubf[2]
    cadedarf+="-"+periodo
    return cadedarf
}

	
	//Crear el arreglo con los numero de telefono y facturas
	console.log("Leyendo Archivo")
	fs.createReadStream(rutasbase+"facturas/envioxwhatsapp.csv").pipe(csv.parse({delimiter:';',skip_empty_lines: true})).on("data", (row) => {results.push(row);}).on("end", () => {

		let fallas=buscarFallas()
		console.log("Buscando Fallas")
		if(fallas)
		console.log("Falla encontrada")
		else{
			console.log("No se encontraron fallas")
			startSock()
		}
		

	});

