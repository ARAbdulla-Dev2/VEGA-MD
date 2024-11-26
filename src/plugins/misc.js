const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { loadReplyHandlers, saveReplyHandlers, clearReplyHandlers } = require("../../utils/replyHandlerUtil");

global.commands = [];

function cmd(command) {
    global.commands.push(command);
}

const commands = [];

function cmd(command) {
    commands.push(command);
}

cmd({
    pattern: "movie",
    description: "Search and download movies.",
    type: "extra",
    execute: async (m, sock, mek, config, startTime, replyHandlers) => {
        const remoteJid = mek?.remoteJid;
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        args.shift(); // Remove the command itself
        const userQuery = args.join(" ").trim();

        if (!userQuery) {
            await sock.sendMessage(remoteJid, { text: "❌ Please provide a movie name to search." });
            return;
        }

        // API base URL
        const apiBase = "http://103.195.101.44:2662/";

        // APIs to search
        const apis = [
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=sin&query=${encodeURIComponent(userQuery)}`,
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=isaiduben&query=${encodeURIComponent(userQuery)}`,
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=isaidubta&query=${encodeURIComponent(userQuery)}`
        ];

        // Create an instance of axios with the custom httpsAgent
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false // Disable SSL certificate validation
    })
  });
  
  

        // Function to fetch data from APIs
        const fetchMovies = async () => {
            const results = [];
            for (const api of apis) {
                try {
                    const response = await axiosInstance.get(api);
                    if (response.data?.status === "true" && Array.isArray(response.data.result)) {
                        response.data.result.forEach((movie) => {
                            // Filter only 720p movies for isaiduben and isaidubta
                            if (
                                (response.data.plugin === "isaiduben" || response.data.plugin === "isaidubta") &&
                                !movie.downloadUrls?.["720p"]
                            ) {
                                return; // Skip non-720p entries
                            }
                            // Add movies to results
                            results.push({
                                ...movie,
                                downloadLink:
                                    movie.finalDownloadLink || movie.downloadUrls?.["720p"] || movie.downloadUrls?.["360p"]
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching data from API: ${api}`, {
                        message: error.message,
                        stack: error.stack
                    });
                }
            }
            return results;
        };

        // Fetch movies
        const movies = await fetchMovies();

        if (movies.length === 0) {
            await sock.sendMessage(remoteJid, { text: "❌ No movies found for your query. Please try again." });
            return;
        }

        // Prepare movie options for user
        let movieList = `🎥 *Movies Found for "${userQuery}":*\n\n`;
        const replyData = {};
        movies.forEach((movie, index) => {
            movieList += `${index + 1}. *${movie.title}*\n   - 📦 Size: ${movie.size || "Unknown"}\n   - 🖥️ Resolution: ${movie.resolution || "720p"}\n\n`;
            replyData[`${index + 1}`] = {
                caption: movie.title,
                type: "document",
                document: {
                    url: movie.downloadLink,
                    mimetype: "video/mp4",
                    fileName: movie.title
                }
            };
        });

        // Send the movie list
        const msg = await sock.sendMessage(remoteJid, { text: movieList });
        const msgId = msg.key.id;

        // Save reply handlers for movie downloads
        replyHandlers[msgId] = {
            key: { remoteJid },
            data: replyData
        };

        saveReplyHandlers(replyHandlers); // Save reply handlers for persistence
    },
});

// download command
cmd({
    pattern: "download",
    description: "Download a file from the given URL and send it. Optionally, provide a custom filename using --fileName.",
    type: "download",
    execute: async (m, sock, mek) => {
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        args.shift(); // Remove the command itself

        // Find the index of --fileName if it exists and extract it
        const fileNameArgIndex = args.findIndex(arg => arg.startsWith("--fileName="));
        const fileName = fileNameArgIndex !== -1 ? args.splice(fileNameArgIndex, 1)[0].split("=")[1] : null;

        // The remaining part after --fileName should be the URL
        const url = args.join(" ").trim();

        if (!url) {
            await sock.sendMessage(mek.remoteJid, {
                text: "❗ Please provide a valid URL to download.\nExample: `.download https://example.com/file.mp4`",
            });
            return;
        }

        // If no filename was provided, use the default filename derived from the URL
        const finalFileName = fileName || url.split("/").pop() || "file";

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to download file: ${response.statusText}`);

            const buffer = await response.buffer();
            await sock.sendMessage(mek.remoteJid, {
                document: buffer,
                fileName: finalFileName,
                mimetype: response.headers.get("content-type") || "application/octet-stream",
            });
        } catch (error) {
            console.error("Error in Download command:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ Failed to download the file. Please check the URL and try again.",
            });
        }
    },
});



cmd({
    pattern: "fetch",
    description: "Fetch data from the given API URL and display the result.",
    type: "extra",
    execute: async (m, sock, mek) => {
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        args.shift(); // Remove the command itself
        const url = args.join(" ").trim(); // The remaining part is the URL

        if (!url) {
            await sock.sendMessage(mek.remoteJid, {
                text: "❗ Please provide a valid API URL to fetch data.\nExample: `.fetch https://api.example.com/data`",
            });
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);

            const data = await response.json(); // Assuming JSON response
            const formattedData = JSON.stringify(data, null, 2); // Pretty-print JSON

            await sock.sendMessage(mek.remoteJid, {
                text: `✅ *Fetched Data:*\n\n\`\`\`${formattedData}\`\`\``,
            });
        } catch (error) {
            console.error("Error in Fetch command:", error);
            await sock.sendMessage(mek.remoteJid, {
                text: "❌ Failed to fetch data. Please check the URL and try again.",
            });
        }
    },
});


// Ping command
cmd({
    pattern: "ping",
    description: "Get the bot's ping.",
    type: "misc",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        try {
            const response = await sock.sendMessage(mek.remoteJid, { text: "*Pinging...*" });
            const start = performance.now();
            await sock.sendMessage(mek.remoteJid, { react: { text: "🚀", key: mek }});
            const latency = (performance.now() - start).toFixed(2);
            await sock.sendMessage(mek.remoteJid, { text: `*${latency}ms*`, edit: response.key });
        } catch (error) {
            console.error("🔺 ERROR IN PING COMMAND:", error);
            await sock.sendMessage(mek.remoteJid, { text: "❌ *ERROR*" });
        }
    },
});


// forward command
cmd({
    pattern: "forward",
    description: "Forward messages.",
    type: "owner",
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
    description: "Get the WA-ID of a user or group.",
    type: "misc",
    isPremium: false,
    execute: async (m, sock, mek, config, startTime, sendButtonMessage) => {
        try {
            let wid;

            // Check for a quoted message
            if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                wid = m.message.extendedTextMessage.contextInfo.participant;
            }
            // Check for mentions in the message
            else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                wid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            // Default to the group ID or sender ID
            else {
                wid = mek.remoteJid;
            }

            // Send the WA-ID as a response
            await sock.sendMessage(mek.remoteJid, { text: `${wid}` }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(mek.remoteJid, { text: "*❌ Error while fetching WA-ID.*" }, { quoted: m });
        }
    },
});




cmd({
    pattern: "quran",
    description: "Search and send Quran Surahs.",
    type: "search",
    execute: async (m, sock, mek, config, startTime, replyHandlers) => {
        const remoteJid = mek?.remoteJid;

        if (!remoteJid) {
            console.error("🔺 INVALID MESSAGE EVENT: remoteJid is missing.");
            await sock.sendMessage(remoteJid, {
                text: "❌ *ERROR*",
            });
            return;
        }

        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const args = msgText.trim().split(" ");
        args.shift(); // Remove the command itself
        const query = args.join(" ").trim();

        if (!query) {
            await sock.sendMessage(remoteJid, {
                text: "❗ Please provide a Surah name to search.\nExample: `.quran Fatiha`",
            });
            return;
        }

        const apiUrl = `https://api.arabdullah.top/api?apiKey=ardevfa6456bc09a877cb&plugin=quran&query=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data || data.status !== "true" || !data.result) {
                await sock.sendMessage(remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            const reciters = Object.entries(data.result);
            if (reciters.length === 0) {
                await sock.sendMessage(remoteJid, {
                    text: `❌ No results found for "${query}". Please try a different query.`,
                });
                return;
            }

            // Build a list of options
            let resultMessage = `📖 *VEGA-MD-QURAN* 📖\n\nSearch Results for "${query}"\n\n🔢 Reply with the number (e.g., 1.1) to get the Surah.\n\n`;
            const options = {};
            reciters.forEach(([reciterName, surahs], reciterIndex) => {
                Object.entries(surahs).forEach(([surahName, surahUrl], surahIndex) => {
                    const optionKey = `${reciterIndex + 1}.${surahIndex + 1}`;
                    options[optionKey] = { reciterName, surahName, surahUrl };
                    resultMessage += `➕ *${optionKey}* - ${reciterName} - ${surahName}\n`;
                });
            });

            const msg = await sock.sendMessage(remoteJid, { image: fs.readFileSync('./src/media/image/any.png') , caption: resultMessage + `\n${config.DEVELOPER.footer}` });
            const msgId = msg.key.id;

            // Save reply handler for Quran selection
            replyHandlers[msgId] = {
                key: { remoteJid },
                data: Object.entries(options).reduce((acc, [key, { reciterName, surahName, surahUrl }]) => {
                    acc[key] = {
                        type: "document",
                        document: {
                            url: surahUrl,
                            mimetype: "audio/mp4",
                            fileName: `${surahName}_By_${reciterName}_VEGA_MD.mp3`,
                        },
                        caption: `📖 *Surah:* ${surahName}\n🎙️ *Reciter:* ${reciterName}`,
                    };
                    return acc;
                }, {}),
            };

            saveReplyHandlers(replyHandlers); // Save reply handlers to storage
        } catch (error) {
            console.error("Error in Quran command:", error);
            await sock.sendMessage(remoteJid, {
                text: "❌ An error occurred while processing your request. Please try again later.",
            });
        }
    },
});

//gemini command
cmd({
    pattern: "gemini",
    description: "Send a query to the Gemini plugin and get a response.",
    type: "extra",
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