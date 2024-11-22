global.commands = [];

function cmd(command) {
    global.commands.push(command);
}

const commands = [];

function cmd(command) {
    commands.push(command);
}

// Ping command
cmd({
    pattern: "ping",
    description: "Get the bot's ping.",
    type: "misc",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        try {
            // Send initial "Pinging..." message
            const response = await sock.sendMessage(mek.remoteJid, { text: "*Pinging...*" });

            // Start the ping process and calculate latency
            const start = Date.now();
            
            // Update the message with progress bars
            await sock.sendMessage(mek.remoteJid, { text: "*[□□□□□]*", edit: response.key });
            await delay(500); // Add delay for better user experience
            await sock.sendMessage(mek.remoteJid, { text: "*[■□□□□]*", edit: response.key });
            await delay(500);
            await sock.sendMessage(mek.remoteJid, { text: "*[■■■□□]*", edit: response.key });
            await delay(500);
            await sock.sendMessage(mek.remoteJid, { text: "*[■■■■□]*", edit: response.key });
            await delay(500);
            await sock.sendMessage(mek.remoteJid, { text: "*[■■■■■]*", edit: response.key });
            
            // Calculate and send latency
            const latency = Date.now() - start;
            await sock.sendMessage(mek.remoteJid, { text: `*${latency}ms*`, edit: response.key });
        } catch (error) {
            console.error("Error in ping command:", error);
            await sock.sendMessage(mek.remoteJid, { text: "*❌ Error occurred. Please try again later.*" });
        }
    },
});

// Helper function to delay the execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// forward command
cmd({
    pattern: "forward",
    description: "Forward messages.",
    type: "misc",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        try {
            const botNumber = formatUserId(sock.user.id);
            const participant = mek.participant || mek.remoteJid;
            const isOwner = participant === config.OWNER.number + "@s.whatsapp.net" || participant === botNumber;

            // Ensure the user is the owner or the bot itself
            if (!isOwner) {
                await sock.sendMessage(mek.remoteJid, {
                    text: "*❌ Only the owner or bot itself can use this command.*",
                });
                return;
            }

            // Ensure the command is executed as a reply to a message
            if (!m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                await sock.sendMessage(mek.remoteJid, {
                    text: "*❗ Reply to the message you want to forward.*",
                });
                return;
            }

            // Extract quoted message details
            const quotedKey = m.message.extendedTextMessage.contextInfo.stanzaId;
            const quotedRemoteJid = m.message.extendedTextMessage.contextInfo.participant || m.remoteJid;
            const quotedMessage = m.message.extendedTextMessage.contextInfo.quotedMessage;

            // Extract targets from the command text
            const commandText = m.message.conversation || m.message.extendedTextMessage.text;
            const rawTargets = commandText
                .replace(/^(\.forward|forward)\s*/i, "") // Remove command prefix
                .split(",") // Split by commas
                .map((num) => num.trim()); // Clean up extra spaces

            // Validate and normalize target numbers/groups
            const targets = rawTargets
                .filter((num) => /^(\d+@s\.whatsapp\.net|[\w-]+@g\.us)$/i.test(num)) // Match valid JIDs
                .map((num) => {
                    if (num.startsWith("+")) num = num.slice(1); // Remove '+' if present
                    if (!num.includes("@")) {
                        num += num.endsWith("g.us") ? "@g.us" : "@s.whatsapp.net"; // Ensure valid domain
                    }
                    return num;
                });

            // If no valid targets
            if (!targets.length) {
                await sock.sendMessage(mek.remoteJid, {
                    text: "*⚠️ No valid targets specified.*\n\nExample: `.forward 94xxxxxxxxx@g.us` or `.forward 94xxxxxxxxx@g.us,abcdxxxxxx@g.us`",
                });
                return;
            }

            // Forward the message to each target
            for (const target of targets) {
                await sock.sendMessage(target, {
                    forward: {
                        key: {
                            remoteJid: quotedRemoteJid,
                            id: quotedKey,
                        },
                        message: quotedMessage,
                    },
                });
            }

            // Send confirmation
            await sock.sendMessage(mek.remoteJid, {
                text: `*✅ Successfully forwarded to ${targets.length} recipient(s)!*`,
            });
        } catch (error) {
            console.error("Error in forward command:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "*❌ Failed to forward. Please try again.*",
            });
        }
    },
});

// Utility function to normalize bot's ID
function formatUserId(userId) {
    return userId.replace(/:\d+@s\.whatsapp\.net$/, "@s.whatsapp.net");
}



// Wid command
cmd({
    pattern: "wid",
    description: "Get the user's or group's WA-ID.",
    type: "misc",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        if (m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.remoteJid){
            if (!m.message.extendedTextMessage.contextInfo.participant){
                sock.sendMessage(mek.remoteJid, {text: m.message.extendedTextMessage.contextInfo.remoteJid});
            } else if (m.message.extendedTextMessage.contextInfo.participant){
                sock.sendMessage(mek.remoteJid, {text: m.message.extendedTextMessage.contextInfo.participant});
            }
        } else {
            sock.sendMessage(mek.remoteJid, {text: mek.remoteJid});
        }
    }
});


module.exports = commands, { cmd };