global.commands = [];

function cmd(command) {
    global.commands.push(command);
}

const commands = [];

function cmd(command) {
    commands.push(command);
}

function isAdmin(participant) {
    return participant.admin === 'admin' || participant.admin === 'superadmin';
}

// Mute command
cmd({
    pattern: "mute",
    description: "Allow only admins to message in a group",
    type: "group",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        if (mek.remoteJid.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(mek.remoteJid);
            const participants = groupMetadata.participants;
            const bot = participants.find(participant => participant.id === sock.user.id);
            const user = participants.find(participant => participant.id === mek.participant);

            if (!bot || !isAdmin(bot)) {
                await sock.sendMessage(mek.remoteJid, {text: '*I need to be an admin to use this command.* ❌'}, {quoted: m});
                return;
            }

            if (!user || !isAdmin(user)) {
                await sock.sendMessage(mek.remoteJid, {text: '*Only group admins can use this command.* ❌'}, {quoted: m});
                return;
            }

            await sock.groupSettingUpdate(mek.remoteJid, 'announcement');
        } else {
            await sock.sendMessage(mek.remoteJid, {text: '*The command can be used only in groups.* ❌'}, {quoted: m});
        }
    }
});

// Unmute command
cmd({
    pattern: "unmute",
    description: "Allow all participants to message in a group",
    type: "group",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        if (mek.remoteJid.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(mek.remoteJid);
            const participants = groupMetadata.participants;
            const bot = participants.find(participant => participant.id === sock.user.id);
            const user = participants.find(participant => participant.id === mek.participant);

            if (!bot || !isAdmin(bot)) {
                await sock.sendMessage(mek.remoteJid, {text: '*I need to be an admin to use this command.* ❌'}, {quoted: m});
                return;
            }

            if (!user || !isAdmin(user)) {
                await sock.sendMessage(mek.remoteJid, {text: '*Only group admins can use this command.* ❌'}, {quoted: m});
                return;
            }

            await sock.groupSettingUpdate(mek.remoteJid, 'not_announcement');
        } else {
            await sock.sendMessage(mek.remoteJid, {text: '*The command can be used only in groups.* ❌'}, {quoted: m});
        }
    }
});

module.exports = commands, { cmd };