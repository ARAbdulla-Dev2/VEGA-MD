const path = require('path');
const fs = require('fs');

// Load reply handlers from the file
const loadReplyHandlers = () => {
    const filePath = path.resolve("store/replyHandler.json");
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

// Save reply handlers to the file
const saveReplyHandlers = (data) => {
    const filePath = path.resolve("store/replyHandler.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Clear all reply handlers from the file
const clearReplyHandlers = () => {
    const filePath = path.resolve("store/replyHandler.json");
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
};

module.exports = {
    loadReplyHandlers,
    saveReplyHandlers,
    clearReplyHandlers,
};