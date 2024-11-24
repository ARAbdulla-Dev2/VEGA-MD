const { default: makeVEGAmdSock, DisconnectReason, useMultiFileAuthState, generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const env = require('dotenv');
const moment = require('moment-timezone');
const os = require('os');
const { loadReplyHandlers, saveReplyHandlers, clearReplyHandlers } = require("./utils/replyHandlerUtil");

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
            console.log(chalk.red(`🔺 VEGAmd's FILES HAVE BEEN CORRUPTED! (E-101)`)); // VEGAmdfilePath
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
    const { state, saveCreds } = await useMultiFileAuthState('./VEGAmdSession');
    const mono = '```';
    const light = '`';

    const sock = makeVEGAmdSock({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ["VEGAmd", "Chrome", "132.0.6834.15"],
        syncFullHistory: false,
        auth: state,
        markOnlineOnConnect: true,
    });

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close' && lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut) {
            console.log(chalk.red('🔺 CONNECTION CLOSED. RECONNECTING... (E-001)'));
            VEGAmdSock();
        } else if (connection === 'open') {
            console.log(chalk.green('✔️  VEGA MD SUCCESSFULLY CONNECTED TO WHATSAPP SERVER.'));

            if (config.SETTINGS.alwaysonline === 'true'){
                sock.sendPresenceUpdate('available');
            } else {
                sock.sendPresenceUpdate('unavailable');
            }

    const pluginDir = path.join(__dirname, 'src/plugins'); // Path to plugins directory
    let commandCount = 0;

        // Read the directory
        const files = fs.readdirSync(pluginDir);

        // Filter files to include only .js files
        const jsFiles = files.filter(file => file.endsWith('.js'));

        jsFiles.forEach(file => {
            const filePath = path.join(pluginDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Count occurrences of `cmd({` which typically indicates a command definition
            const matches = fileContent.match(/cmd\({/g);
            if (matches) {
                commandCount += matches.length;
            }
        });

            const formattedUserId = formatUserId(sock.user.id);
            sock.sendMessage(formattedUserId, { image: fs.readFileSync('./src/media/image/connection.png'), caption: `${light}CONNECTED${light}\n${mono}\n➕VERSION  - ${config.DEVELOPER.version}\n➕PLUGINS  - ${commandCount}\n➕PREFIX   - ${config.SETTINGS.prefix}\n➕DEVELOPER- ${config.DEVELOPER.phone}${mono}\n\n${config.DEVELOPER.footer}` });
            console.log(chalk.green(`      ➕ VERSION   - ${config.DEVELOPER.version}\n      ➕ PLUGINS   - ${commandCount}\n      ➕ PREFIX    - ${config.SETTINGS.prefix}\n      ➕ DEVELOPER - ${config.DEVELOPER.phone}`));
        } else if (connection === 'close' && lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut) {
            console.log(chalk.red('🔺 THE SESSION FILE HAS EXPIRED (E-000).'));
        }
    });



// Load the reply handlers into memory
let replyHandlers = loadReplyHandlers();

sock.ev.on("messages.upsert", async (VEGAmdMsg) => {
    const mek = VEGAmdMsg.messages[0]?.key;
    const m = VEGAmdMsg.messages[0];
    const remoteJid = mek?.remoteJid;

    if (!remoteJid) {
        console.error("Invalid message event: remoteJid is missing.");
        return;
    }

    const msgId = mek.id;
    const msg = m?.message?.conversation || m?.message?.extendedTextMessage?.text;
    const quotedMsg = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedMsgId = m?.message?.extendedTextMessage?.contextInfo?.stanzaId;

    // Check if the message is a reply to a stored handler
    if (quotedMsgId && replyHandlers[quotedMsgId]) {
        const handler = replyHandlers[quotedMsgId];
        const replyText = msg?.trim();

        // Validate the replyText (the user's selection, which should be a number)
        if (replyText && handler.data[replyText]) {
            const nextReply = handler.data[replyText];

            // Handle different types of replies: text, document, audio, image
            if (nextReply.type === 'text') {
                await sock.sendMessage(remoteJid, { text: nextReply.msg });
            } else if (nextReply.type === 'document') {
                await sock.sendMessage(remoteJid, {
                    document: { url: nextReply.document.url },
                    mimetype: nextReply.document.mimetype,
                    fileName: nextReply.document.fileName,
                    caption: nextReply.caption || ''
                });
            } else if (nextReply.type === 'audio') {
                await sock.sendMessage(remoteJid, {
                    audio: { url: nextReply.audio.url },
                    mimetype: 'audio/mp4',
                    caption: nextReply.caption || ''
                });
            } else if (nextReply.type === 'image') {
                await sock.sendMessage(remoteJid, {
                    image: { url: nextReply.image.url },
                    caption: nextReply.caption || ''
                });
            }

            // Don't delete the handler after sending the reply
            // (this is where the deletion of the handler was previously)
            // delete replyHandlers[quotedMsgId];
            // saveReplyHandlers(replyHandlers);
        } else {
            // If the reply is invalid
            await sock.sendMessage(remoteJid, { text: "❌ Invalid selection. Please use a valid option." });
        }
        return;
    }

    // Command handling for other commands
    if (msg && msg.startsWith(config.SETTINGS.prefix)) {
        const commandName = msg.slice(config.SETTINGS.prefix.length).trim().split(" ")[0].toLowerCase();
        const command = commands.find((cmd) => cmd.pattern === commandName);

        if (command) {
            try {
                await command.execute(m, sock, mek, config, Date.now(), replyHandlers);
            } catch (error) {
                console.error("Error in command execution:", error);
                await sock.sendMessage(remoteJid, {
                    text: "❌ An error occurred while processing your command.",
                });
            }
        }
    }
});

    sock.ev.on('creds.update', saveCreds);
}

printVEGAmd();

if (checkRequiredFiles()) {

    if (config.SETTINGS.sessionId && config.SETTINGS.sessionId.startsWith('VEGAmdSession1.0')){
        VEGAmdSock();
    } else {
        console.log(chalk.red('🔺 UPDATE THE SESSION ID VARIABLE ON CONFIG.JS! (E-002)'));
    }
} else {
    console.log(chalk.red('🔺 PLEASE FORK VEGAmd GITHUB REPO AGAIN AND TRY! (E-101)'));
}