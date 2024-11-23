const fs = require('fs');
const moment = require('moment');
const os = require('os');
const path = require('path');

const mono = '```';
const light = '`';

global.commands = [];

function cmd(command) {
    global.commands.push(command);
}

const commands = [];

function cmd(command) {
    commands.push(command);
}



// alive command
cmd({
    pattern: "alive",
    description: "Get whether the bot is alive.",
    type: "main",
    isPremium: false,
    execute: (m, sock, mek, config, startTime, sendButtonMessage) => {
        const isGroup = mek.remoteJid.endsWith('@g.us');
        let isSudo;
        let jid;
        const currentTime = moment().tz(config.SETTINGS.region).format('HH:mm');
        const fullCurrentTime = moment().tz(config.SETTINGS.region).format('YYYYMMDDHHmmss');
        const startMoment = moment(startTime, 'YYYYMMDDHHmmss');
        const currentMoment = moment(fullCurrentTime, 'YYYYMMDDHHmmss');
        const duration = moment.duration(currentMoment.diff(startMoment));
        const uptime = `${Math.floor(duration.asDays()).toString().padStart(2, '0')}D ${duration.hours().toString().padStart(2, '0')}H ${duration.minutes().toString().padStart(2, '0')}M`;
        const totalMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
        const usedMemoryMB = totalMemoryMB - Math.round(os.freemem() / 1024 / 1024);

        if (!isGroup) {
            isSudo = mek.remoteJid === `${config.OWNER.number}@s.whatsapp.net`;
            jid = mek.remoteJid.replace(/@s\.whatsapp\.net$/, '');
        } else {
            isSudo = mek.participant === `${config.OWNER.number}@s.whatsapp.net`;
            jid = mek.participant.replace(/@s\.whatsapp\.net$/, '');
        }

        const bodyMessage = `${light}${config.BOT.name}${light}\n\n🔺 *Time:* ${currentTime}\n🔺 *Region:* ${config.SETTINGS.region}\n🔺 *User:* @${jid}\n🔺 *isSudo:* ${isSudo}\n🔺 *Uptime:* ${uptime}\n🔺 *Memory:* ${usedMemoryMB}/${totalMemoryMB}\n\n${mono}I am still awake, how can I help you?${mono}\n`;
        const footerMessage = 'RAW-MD v1.0';
        const buttons = [
            { type: 'reply', text: 'MENU', id: config.SETTINGS.prefix + 'menu' + '-btn' },
            { type: 'url', text: 'SCRIPT', url: 'https://github.com' }
        ];

        const image = 'fs:./src/media/image/alive.png';

        sendButtonMessage(sock, mek.remoteJid, bodyMessage, footerMessage, buttons, image);
    }
});

// owner command
cmd({
    pattern: "owner",
    description: "Get the bot owner's number.",
    type: "main",
    isPremium: false,
    execute: (m, sock, mek, config, startTime, sendButtonMessage) => {
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + `FN:${config.OWNER.name}\n`
            + `ORG:${config.OWNER.gmail};\n`
            + `TEL;type=CELL;type=VOICE;waid=${config.OWNER.number}:+${config.OWNER.number}\n`
            + 'END:VCARD';

        sock.sendMessage(mek.remoteJid, { contacts: { displayName: config.OWNER.name, contacts: [{ vcard }] } });
    }
});



module.exports = commands, { cmd };
