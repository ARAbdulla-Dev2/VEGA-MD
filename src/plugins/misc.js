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
            // Ensure the command is executed by the owner
            if (mek.remoteJid !== config.OWNER.number + "@s.whatsapp.net") {
                await sock.sendMessage(mek.remoteJid, {
                    text: "*❌ Only the owner can use this.*",
                });
                return;
            }

            // Ensure the command is executed as a reply
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

            // Extract numbers from the command
            const commandText = m.message.conversation || m.message.extendedTextMessage.text;
            const rawTargets = commandText
                .replace(/^(\.forward|forward)\s*/i, "") // Remove the command prefix
                .split(",") // Split by comma
                .map((num) => num.trim()); // Clean up extra spaces

            // Validate and normalize numbers
            const targets = rawTargets
                .filter((num) => /^(\+?\d+|[\d]+@s\.whatsapp\.net)$/i.test(num)) // Validate number formats
                .map((num) => {
                    if (num.startsWith("+")) num = num.slice(1); // Remove the '+' if present
                    if (!num.includes("@s.whatsapp.net")) num += "@s.whatsapp.net"; // Ensure proper JID
                    return num;
                });

            // If no valid numbers are found
            if (!targets.length) {
                await sock.sendMessage(mek.remoteJid, {
                    text: "*⚠️ No valid numbers to forward.*\n\nTry: `.forward 94xxxxxxxxx`",
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

            // Send a confirmation message
            await sock.sendMessage(mek.remoteJid, {
                text: `*✅ Forwarded to ${targets.length} recipient(s)!*\n> *VEGA-MD v1.0* ✨`,
            });
        } catch (error) {
            console.error("Error forwarding message:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "*❌ Failed to forward. Try again.*",
            });
        }
    },
});


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