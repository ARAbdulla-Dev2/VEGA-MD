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

async function sendButtonMessage(sock, remoteJid, bodyMessage, footerMessage, buttons, image) {
    const formattedButtons = buttons.map((btn) => {
        if (btn.type === 'reply') {
            return {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.id
                })
            };
        } else if (btn.type === 'url') {
            return {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    url: btn.url
                })
            };
        } else if (btn.type === 'select') {
            return {
                name: "single_select",
                buttonParamsJson: btn.info,
            };
        } else if (btn.type === 'copy') {
            return {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.id,
                    copy_code: btn.code,
                })
            };
        }
    });

    let headerOptions = {
        title: "",
        gifPlayback: true,
        subtitle: "",
        hasMediaAttachment: false,
    };

    if (image) {
        const buffer = String(image).startsWith("fs:") 
            ? fs.readFileSync(String(image).replace(/fs:/gi, '')) 
            : await getImageBuffer(image);
        const imageMedia = await prepareWAMessageMedia({ image: buffer }, { upload: sock.waUploadToServer });
        
        headerOptions = {
            title: "",
            gifPlayback: true,
            subtitle: "",
            hasMediaAttachment: true,
            imageMessage: imageMedia.imageMessage
        };
    }

    const msg = generateWAMessageFromContent(remoteJid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: bodyMessage
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: footerMessage
                    }),
                    header: proto.Message.InteractiveMessage.Header.create(headerOptions),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: formattedButtons
                    }),
                    contextInfo: {
                        mentionedJid: [remoteJid],
                        forwardingScore: 0,
                        isForwarded: false,
                    }
                }),
            },
        },
    }, {});

    await sock.relayMessage(remoteJid, msg.message, {
        messageId: msg.key.id
    });
}

async function getImageBuffer(imageUrl) {
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    return buffer;
}

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
    const mek = VEGAmdMsg.messages[0].key;
    const m = VEGAmdMsg.messages[0];
    let msg;

    if (m && m.message && (m.message.extendedTextMessage || m.message.conversation)) {
        msg = m.message.extendedTextMessage?.text || m.message.conversation || null;
    }

    // Check for command
    if (msg && msg.startsWith(config.SETTINGS.prefix)) {
        const commandName = msg.slice(config.SETTINGS.prefix.length).trim().split(' ')[0].toLowerCase();
        const command = commands.find(cmd => cmd.pattern === commandName);
        if (command) {
            await command.execute(m, sock, mek, config, startTime, sendButtonMessage, replyHandlers);
        }
        return;
    }

    // Handle replies for ongoing interactions
    if (
        m?.message?.extendedTextMessage?.contextInfo?.quotedMessage &&
        m.message.extendedTextMessage.contextInfo.quotedMessage.conversation
    ) {
        const quotedText = m.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        const replyHandler = replyHandlers[mek.remoteJid];

        if (replyHandler && replyHandler.context === quotedText) {
            // Pass the reply to the relevant plugin
            try {
                await replyHandler.handler(m, sock, mek, config);
            } catch (error) {
                console.error("Error in reply handler:", error);
                sock.sendMessage(mek.remoteJid, {
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