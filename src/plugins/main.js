const fs = require('fs');
const moment = require('moment');
const os = require('os');
const path = require('path');
const { loadReplyHandlers, saveReplyHandlers, clearReplyHandlers } = require("../../utils/replyHandlerUtil");

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

cmd({
    pattern: "menu",
    description: "Display all bot commands categorized by type.",
    type: "main",
    execute: async (m, sock, mek, config, startTime, replyHandlers) => {
        const remoteJid = mek?.remoteJid;

        const types = Object.keys(groupedCommands);
        let mainMenuMessage = `💠 *VEGA-MD-MENU* 💠\n\n🔢 Reply with the number (e.g., 1) to choose a menu type.\n\n`;

        types.forEach((type, index) => {
            mainMenuMessage += `> *${index + 1} ${type.toUpperCase()} MENU*\n`;
        });

        mainMenuMessage += '\n'+config.DEVELOPER.footer;

        const msg = await sock.sendMessage(remoteJid, { image: fs.readFileSync('./src/media/image/any.png') , caption: mainMenuMessage });
        const msgId = msg.key.id

        // Save menu options for reply handling
        replyHandlers[msgId] = {
            key: { remoteJid },
            data: types.reduce((acc, type, index) => {
                const menuMessage = `*${type.toUpperCase()} MENU*\n\n${groupedCommands[type].map(cmd => `${config.SETTINGS.prefix}${cmd.pattern}`).join('\n')}`;
                acc[(index + 1).toString()] = {
                    image: fs.readFileSync('./src/media/image/any.png'),
                    caption: menuMessage + '\n\n'+ config.DEVELOPER.footer,
                    type: 'image',
                };
                return acc;
            }, {}),
        };

        saveReplyHandlers(replyHandlers); // Save the updated reply handlers to file
    },
});

cmd({
    pattern: "cls",
    description: "Clear cached reply handlers.",
    type: "main",
    isPremium: false,
    execute: async (m, sock, mek, config) => {
        const botNumber = formatUserId(sock.user.id);
            const participant = mek.participant || mek.remoteJid;
            const isOwner = participant === config.OWNER.number + "@s.whatsapp.net" || participant === botNumber;

        // Ensure the message is sent by the bot or the owner
        if ( !isOwner) {
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ You do not have permission to use this command.",
            });
            return;
        }

        try {
            // Clear reply handlers
            clearReplyHandlers();

            // Notify success
            await sock.sendMessage(mek.remoteJid, {
                text: "✅ Successfully cleared all reply handlers.",
            });
        } catch (error) {
            console.error("Error clearing reply handlers:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ An error occurred while clearing reply handlers.",
            });
        }
    },
});

// Utility function to normalize bot's ID
function formatUserId(userId) {
    return userId.replace(/:\d+@s\.whatsapp\.net$/, "@s.whatsapp.net");
}



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

module.exports = commands, {cmd };  // Correct export

let menuCommands = [];

fs.readdirSync('./src/plugins').forEach(file => {
    if (file.endsWith('.js')) {
        try {
            const pluginCommands = require(path.join(__dirname, file));

            if (Array.isArray(pluginCommands)) {
                menuCommands = menuCommands.concat(pluginCommands);
            } else {
                console.warn(`Plugin file ${file} does not export an array of commands.`);
            }
        } catch (err) {
            console.error(`Error loading plugin from ${file}:`, err.message);
        }
    }
});

// Group commands by type
const groupedCommands = {};
menuCommands.forEach(cmdm => {
    if (cmdm.type) {
        if (!groupedCommands[cmdm.type]) {
            groupedCommands[cmdm.type] = [];
        }
        groupedCommands[cmdm.type].push(cmdm);
    }
});
