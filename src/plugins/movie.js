const axios = require('axios');

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
        const userQuery = m.message.conversation.split(" ").slice(1).join(" ").trim();

        if (!userQuery) {
            await sock.sendMessage(remoteJid, { text: "❌ Please provide a movie name to search." });
            return;
        }

        // Updated API base domain
        const apiBase = "http://103.195.101.44:2662/";

        // APIs to search
        const apis = [
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=sin&query=${encodeURIComponent(userQuery)}`,
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=isaiduben&query=${encodeURIComponent(userQuery)}`,
            `${apiBase}api?apiKey=ardevfa6456bc09a877cb&plugin=isaidubta&query=${encodeURIComponent(userQuery)}`
        ];

        // Function to fetch data from APIs
        const fetchMovies = async () => {
            const results = [];
            for (const api of apis) {
                try {
                    const response = await axios.get(api, { timeout: 10000 }); // 10-second timeout
                    if (response.data.status === "true" && Array.isArray(response.data.result)) {
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
                    console.log(`Error fetching data from API: ${api}`, error.message);
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
                text: movie.title,
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



module.exports = commands, { cmd };