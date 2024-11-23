const fetch = require('node-fetch');
const fs = require('fs');

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


// Quran Command
cmd({
    pattern: "quran",
    description: "Search and send Quran Surahs.",
    type: "misc",
    execute: async (m, sock, mek, config, startTime, sendButtonMessage, replyHandlers) => {
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        const command = args.shift().toLowerCase(); // Extract command and normalize to lowercase
        const query = args.join(" ").trim(); // Join remaining parts as the query

        if (command !== ".quran" || !query) {
            await sock.sendMessage(mek.remoteJid, {
                text: "❗ Please provide a surah name to search.\nExample: `.quran Fatiha`",
            });
            return;
        }

        // Fetch Quran results
        const apiUrl = `https://api.arabdullah.top/api?apiKey=ardevfa6456bc09a877cb&plugin=quran&query=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            // Exit early if `result.message` indicates no surahs were found
            if (data.result?.message === "No results found for your query.") {
                await sock.sendMessage(mek.remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            // Handle invalid or empty results
            if (data.status !== "true" || !data.result || Object.keys(data.result).length === 0) {
                await sock.sendMessage(mek.remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            const reciters = Object.entries(data.result);
            if (reciters.length === 0) {
                await sock.sendMessage(mek.remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            let resultMessage = `📖 *VEGA-MD-QURAN* 📖\n\n*Search Results for "${query}" from ARAbdulla-Dev's Quran API*\n\n🔢 *Reply with the number (e.g., 1.1) to get the surah.*\n\n`;
            reciters.forEach(([reciterName, surahs], index) => {
                Object.entries(surahs).forEach(([surahName, surahUrl], subIndex) => {
                    resultMessage += `🔺 *${index + 1}.${subIndex + 1}* - ${reciterName} - ${surahName}\n`;
                });
            });

            if (resultMessage.trim() === `*Search Results for "${query}":*\n\n`) {
                // No valid results to display
                await sock.sendMessage(mek.remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            //await sock.sendMessage(mek.remoteJid, { image:fs.readFileSync('./src/media/image/any.png'),caption: resultMessage + `\n\n${config.DEVELOPER.footer}` });
            await sock.sendMessage(mek.remoteJid, { text: resultMessage });

            // Set up a reply handler for this specific context
            replyHandlers[mek.remoteJid] = {
                context: resultMessage,
                handler: async (reply, sock, mek, config) => {
                    const replyText = reply.message.conversation || reply.message.extendedTextMessage?.text;

                    if (!replyText) {
                        await sock.sendMessage(mek.remoteJid, { text: "❌ Invalid reply. Please reply with a valid number." });
                        return;
                    }

                    const [reciterIndexStr, surahIndexStr] = replyText.trim().split(".");
                    const reciterIndex = parseInt(reciterIndexStr, 10) - 1;
                    const surahIndex = parseInt(surahIndexStr, 10) - 1;

                    if (
                        !isNaN(reciterIndex) &&
                        !isNaN(surahIndex) &&
                        reciterIndex >= 0 &&
                        reciterIndex < reciters.length &&
                        surahIndex >= 0 &&
                        surahIndex < Object.entries(reciters[reciterIndex][1]).length
                    ) {
                        const [reciterName, surahs] = reciters[reciterIndex];
                        const [surahName, surahUrl] = Object.entries(surahs)[surahIndex];

                        if (surahName && surahUrl) {
                            await sock.sendMessage(mek.remoteJid, {
                                document: { url: surahUrl },
                                mimetype: "audio/mp4",
                                fileName: surahName + '_By_' + reciterName + '_VEGA_MD.mp3',
                                caption: `📖 *Surah:* ${surahName}\n🎙️ *Reciter:* ${reciterName}`,
                            });
                        }
                    } else {
                        await sock.sendMessage(mek.remoteJid, {
                            text: "❌ Invalid selection. Please reply with a valid number.",
                        });
                    }
                },
            };
        } catch (error) {
            console.error("Error in Quran command:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ An error occurred while processing your request. Please try again later.",
            });
        }
    },
});

//gemini command
cmd({
    pattern: "gemini",
    description: "Send a query to the Gemini plugin and get a response.",
    type: "misc",
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        const command = args.shift().toLowerCase(); // Extract the command
        const query = args.join(" ").trim(); // The rest is the query

        // Ensure the query is provided
        if (!query) {
            await sock.sendMessage(mek.remoteJid, {
                text: "❗ Please provide a query for Gemini.\nExample: `.gemini hi`",
            });
            return;
        }

        // Build the API URL
        const apiUrl = `https://api.arabdullah.top/api?apiKey=ardevfa6456bc09a877cb&plugin=gemini&query=${encodeURIComponent(query)}`;

        try {
            // Fetch the API response
            const response = await fetch(apiUrl);
            const data = await response.json();

            // Check if the response is valid
            if (data.status !== "true" || !data.result || !data.result.response) {
                await sock.sendMessage(mek.remoteJid, {
                    text: `❌ No valid response for your query "${query}". Please try again later.`,
                });
                return;
            }

            // Send the result back to the user
            const replyMessage = `${data.result.response}`;
            await sock.sendMessage(mek.remoteJid, {
                text: replyMessage,
            });
        } catch (error) {
            console.error("Error in Gemini command:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ An error occurred while processing your request. Please try again later.",
            });
        }
    },
});



module.exports = commands, { cmd };