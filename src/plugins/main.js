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

cmd({
    pattern: "menu",
    description: "Display all bot commands categorized by type.",
    type: "main",
    execute: async (m, sock, mek, config, startTime, replyHandlers) => {
        const remoteJid = mek?.remoteJid;

        if (!remoteJid) {
            console.error("Invalid message event: remoteJid is missing.");
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ An error occurred. Could not identify the chat session.",
            });
            return;
        }

        replyHandlers[remoteJid] = replyHandlers[remoteJid] || {};

        const types = Object.keys(groupedCommands);
        let mainMenuMessage = `*MAIN MENU*\n\n`;

        // Build the menu with hidden values in the message text
        types.forEach((type, index) => {
            mainMenuMessage += `[${index + 1}] ${type.toUpperCase()}\n`;
        });
        mainMenuMessage += `\nReply with the number (e.g., 1) to choose a menu type.`;

        await sock.sendMessage(remoteJid, { text: mainMenuMessage });

        // Set reply handler for menu selection
        replyHandlers[remoteJid].context = "menu";
        replyHandlers[remoteJid].handler = async (reply, sock, mek, config) => {
            const replyText = reply.message.conversation || reply.message.extendedTextMessage?.text;
            const selectedIndex = parseInt(replyText.trim(), 10) - 1;

            if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < types.length) {
                const selectedType = types[selectedIndex];
                const commandsOfType = groupedCommands[selectedType];

                if (commandsOfType?.length > 0) {
                    let submenuMessage = `*${selectedType.toUpperCase()} MENU*\n\n`;
                    commandsOfType.forEach(cmd => {
                        submenuMessage += `- ${config.SETTINGS.prefix}${cmd.pattern} - ${cmd.description}\n`;
                    });

                    await sock.sendMessage(remoteJid, { text: submenuMessage });
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: `❌ No commands found for the selected menu.`,
                    });
                }
            } else {
                await sock.sendMessage(remoteJid, {
                    text: "❌ Invalid selection. Please reply with a valid number.",
                });
            }
        };
    },
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
