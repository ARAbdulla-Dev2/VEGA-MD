const { default: makeVEGAmdSock, DisconnectReason, useMultiFileAuthState, generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const env = require('dotenv');
const moment = require('moment-timezone');
const os = require('os');

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

// Global object to track pending reply interactions
const replyHandlers = {};

sock.ev.on('messages.upsert', async (VEGAmdMsg) => {
    const mek = VEGAmdMsg.messages[0]?.key;
    const m = VEGAmdMsg.messages[0];
    const remoteJid = mek?.remoteJid;

    // Validate message structure
    if (!remoteJid) {
        console.error("Invalid message event: remoteJid is missing.");
        return;
    }

    let msg = null;
    if (m?.message && (m.message.extendedTextMessage || m.message.conversation)) {
        msg = m.message.extendedTextMessage?.text || m.message.conversation;
    }

    // Check if it's a command
    if (msg && msg.startsWith(config.SETTINGS.prefix)) {
        const commandName = msg.slice(config.SETTINGS.prefix.length).trim().split(' ')[0].toLowerCase();
        const command = commands.find(cmd => cmd.pattern === commandName);

        if (command) {
            try {
                await command.execute(m, sock, mek, config, startTime, replyHandlers);
            } catch (error) {
                console.error("Error in command execution:", error);
                await sock.sendMessage(remoteJid, { text: "❌ An error occurred while processing your command." });
            }
        }
        return;
    }

    // Handle replies for ongoing interactions
    const quotedMessage = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    if (quotedMessage && replyHandlers[remoteJid]) {
        const replyHandler = replyHandlers[remoteJid];

        // Dynamically handle the context of the reply
        if (replyHandler?.context && replyHandler.handler) {
            try {
                await replyHandler.handler(m, sock, mek, config);
            } catch (error) {
                console.error("Error in reply handler:", error);
                await sock.sendMessage(remoteJid, {
                    text: "❌ An error occurred while processing your reply.",
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