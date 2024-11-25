const {
	default: makeVEGAmdSock,
	DisconnectReason,
	useMultiFileAuthState,
	generateWAMessageFromContent,
	proto,
	prepareWAMessageMedia
} = require('@whiskeysockets/baileys');
const {
	Boom
} = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const env = require('dotenv');
const moment = require('moment-timezone');
const os = require('os');
const {
	loadReplyHandlers,
	saveReplyHandlers,
	clearReplyHandlers
} = require("./utils/replyHandlerUtil");

clearReplyHandlers();

const config = require('./config');
env.config();

let commands = [];

fs.readdirSync('./src/plugins').forEach(file => {
	if (file.endsWith('.js')) {
		const pluginCommands = require(`./src/plugins/${file}`);
		commands = commands.concat(pluginCommands);
	}
});

const startTime = moment().tz(config.SETTINGS.region).format('YYYYMMDDHHmmss');

const consoleTextFilePath = path.join(__dirname, 'src', 'VEGAmd.txt');
const requiredDirs = [
	path.join(__dirname, 'arabdullah.dev'),
	path.join(__dirname, 'src', 'arabdullah.dev'),
	path.join(__dirname, 'src', 'media', 'arabdullah.dev'),
	path.join(__dirname, 'src', 'plugins', 'arabdullah.dev'),
	path.join(__dirname, 'src', 'media', 'image', 'arabdullah.dev'),
	path.join(__dirname, 'src', 'media', 'audio', 'arabdullah.dev'),
	path.join(__dirname, 'src', 'media', 'video', 'arabdullah.dev')
];

function formatUserId(userId) {
	return userId.replace(/:\d+@s\.whatsapp\.net$/, "@s.whatsapp.net");
}

function checkRequiredFiles() {
	let allFilesExist = true;
	requiredDirs.forEach((VEGAmdfilePath) => {
		if (!fs.existsSync(VEGAmdfilePath)) {
			console.log(chalk.red(`🔺 VEGAmd's FILES HAVE BEEN CORRUPTED! (E-101)`));
			allFilesExist = false;
		}
	});
	return allFilesExist;
}

function printVEGAmd() {
	try {
		const content = fs.readFileSync(consoleTextFilePath, 'utf-8');
		console.log(chalk.blue(content));
	} catch (error) {
		console.log(chalk.red('🔺 E-100'));
	}
}

async function VEGAmdSock() {
	const {
		state,
		saveCreds
	} = await useMultiFileAuthState('./VEGAmdSession');
	const mono = '```';
	const light = '`';

	const sock = makeVEGAmdSock({
		logger: pino({
			level: 'silent'
		}),
		printQRInTerminal: true,
		browser: ["VEGAmd", "Chrome", "132.0.6834.15"],
		syncFullHistory: false,
		auth: state,
		markOnlineOnConnect: true,
	});

	sock.ev.on('connection.update', ({
		connection,
		lastDisconnect
	}) => {
		if (connection === 'close' && lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut) {
			console.log(chalk.red('🔺 CONNECTION CLOSED. RECONNECTING... (E-001)'));
			VEGAmdSock();
		} else if (connection === 'open') {
			console.log(chalk.green('✔️  VEGA MD SUCCESSFULLY CONNECTED TO WHATSAPP SERVER.'));

			if (config.SETTINGS.alwaysonline === 'true') {
				sock.sendPresenceUpdate('available');
			} else {
				sock.sendPresenceUpdate('unavailable');
			}

			const pluginDir = path.join(__dirname, 'src/plugins');
			let commandCount = 0;

			const files = fs.readdirSync(pluginDir);

			const jsFiles = files.filter(file => file.endsWith('.js'));

			jsFiles.forEach(file => {
				const filePath = path.join(pluginDir, file);
				const fileContent = fs.readFileSync(filePath, 'utf-8');

				const matches = fileContent.match(/cmd\({/g);
				if (matches) {
					commandCount += matches.length;
				}
			});

			const formattedUserId = formatUserId(sock.user.id);
			sock.sendMessage(formattedUserId, {
				image: fs.readFileSync('./src/media/image/connection.png'),
				caption: `${light}CONNECTED${light}\n${mono}\n➕VERSION  - ${config.DEVELOPER.version}\n➕PLUGINS  - ${commandCount}\n➕PREFIX   - ${config.SETTINGS.prefix}\n➕DEVELOPER- ${config.DEVELOPER.phone}${mono}\n\n${config.DEVELOPER.footer}`
			});
			console.log(chalk.green(`      ➕ VERSION   - ${config.DEVELOPER.version}\n      ➕ PLUGINS   - ${commandCount}\n      ➕ PREFIX    - ${config.SETTINGS.prefix}\n      ➕ DEVELOPER - ${config.DEVELOPER.phone}`));
		} else if (connection === 'close' && lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut) {
			console.log(chalk.red('🔺 THE SESSION FILE HAS EXPIRED (E-000).'));
		}
	});

	const badWords = fs
    .readFileSync(path.join(__dirname, 'data/badwords.txt'), 'utf-8')
    .split(/\s+/) // Split on any whitespace
    .map(word => word.trim())
    .filter(word => word.length > 0);
	let replyHandlers = loadReplyHandlers();

	// Load allowed groups from badword.json
const badwordConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data/badword.json'), 'utf-8')
);

	sock.ev.on("messages.upsert", async (VEGAmdMsg) => {
		const mek = VEGAmdMsg.messages[0]?.key;
		const m = VEGAmdMsg.messages[0];
		const remoteJid = mek?.remoteJid;
	
		if (!remoteJid) {
			console.log(chalk.red("🔺 INVALID MESSAGE EVENT: remoteJid is missing"));
			return;
		}
	
		const msgId = mek.id;
		const isGroup = remoteJid.endsWith('@g.us');
		const msg = m?.message?.conversation || m?.message?.extendedTextMessage?.text;
		const quotedMsg = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
		const quotedMsgId = m?.message?.extendedTextMessage?.contextInfo?.stanzaId;
	
		// Handle reply handlers
		if (quotedMsgId && replyHandlers[quotedMsgId]) {
			const handler = replyHandlers[quotedMsgId];
			const replyText = msg?.trim();
	
			if (replyText && handler.data[replyText]) {
				const nextReply = handler.data[replyText];
	
				try {
					if (nextReply.type === 'text') {
						await sock.sendMessage(remoteJid, {
							text: nextReply.msg,
						});
					} else if (nextReply.type === 'document') {
						await sock.sendMessage(remoteJid, {
							document: {
								url: nextReply.document.url,
							},
							mimetype: nextReply.document.mimetype,
							fileName: nextReply.document.fileName,
							caption: nextReply.caption || '',
						});
					} else if (nextReply.type === 'audio') {
						await sock.sendMessage(remoteJid, {
							audio: {
								url: nextReply.audio.url,
							},
							mimetype: 'audio/mp4',
							caption: nextReply.caption || '',
						});
					} else if (nextReply.type === 'image') {
						await sock.sendMessage(remoteJid, {
							image: nextReply.image,
							caption: nextReply.caption || '',
						});
					}
				} catch (error) {
					console.log(chalk.red("🔺 ERROR IN REPLY HANDLER EXECUTION:"), error);
					await sock.sendMessage(remoteJid, {
						text: "❌ *ERROR IN REPLY HANDLER*",
					});
				}
			} else {
				await sock.sendMessage(remoteJid, {
					text: "❌ *INVALID SELECTION*",
				});
			}
			return;
		}
	
		// Bad words filtering
if (config.SETTINGS.antibadwords && isGroup && msg && badwordConfig.groups.includes(remoteJid)) {
    const containsBadWords = badWords.some(word => msg.toLowerCase().includes(word.toLowerCase()));

    if (containsBadWords) {
        try {
            // Fetch group metadata to check admin status
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = groupMetadata.participants.some(
                p => p.id === botNumber && (p.admin === 'admin' || p.admin === 'superadmin')
            );

            if (isBotAdmin) {
                // Remove the bad word message
                await sock.sendMessage(remoteJid, { delete: mek });

                // Get the sender ID and format for mention
                const badUserId = mek.participant.replace('@s.whatsapp.net', '');

                // Send warning message
                await sock.sendMessage(remoteJid, {
                    text: `⚠️ *HEY* @${badUserId}, *PLEASE AVOID USING BAD WORDS IN THIS GROUP.*`,
                    mentions: [mek.participant],
                });
            }
        } catch (error) {
            await sock.sendMessage(remoteJid, { text: '❌ *ERROR IN BAD WORD HANDLER*' });
        }
    }
}


		// Handle commands
		if (msg && msg.startsWith(config.SETTINGS.prefix)) {
			const commandName = msg.slice(config.SETTINGS.prefix.length).trim().split(" ")[0].toLowerCase();
			const command = commands.find((cmd) => cmd.pattern === commandName);
	
			if (command) {
				try {
					await command.execute(m, sock, mek, config, Date.now(), replyHandlers);
				} catch (error) {
					console.log(chalk.red("🔺 ERROR IN COMMAND EXECUTION:", error));
					await sock.sendMessage(remoteJid, {
						text: "❌ *ERROR*",
					});
				}
			}
		}
	});
	

	sock.ev.on('creds.update', saveCreds);
}

printVEGAmd();

if (checkRequiredFiles()) {

	if (config.SETTINGS.sessionId && config.SETTINGS.sessionId.startsWith('VEGAmdSession1.0')) {
		VEGAmdSock();
	} else {
		console.log(chalk.red('🔺 UPDATE THE SESSION ID VARIABLE ON CONFIG.JS! (E-002)'));
	}
} else {
	console.log(chalk.red('🔺 PLEASE FORK VEGAmd GITHUB REPO AGAIN AND TRY! (E-101)'));
}