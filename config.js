/*  

    ** RAW MD v1.0 CONFIGURATION **

*/

const env = require('dotenv');
const { version } = require('pino');
env.config();

let DEVELOPER = {
    version: 'v1.0',
    phone: '94715733954',
    footer: '> ➕ *VEGA-MD v1.0*'
}

let OWNER = {    
    name: process.env.OWNER_NAME,
    number: process.env.OWNER_NUMBER,
    gmail: process.env.GMAIL,
    github: process.env.GITHUB,
    mongodb: process.env.MONGODB,
    emoji: process.env.OWNER_REACT_EMOJI,
}

let BOT = {
    name: process.env.BOT_NAME,   
}

let SETTINGS = {
    sessionId : process.env.SESSION_ID || 'VEGAmdSession1.0', // Get it from https://...
    wagc : process.env.WA_GRP,
    premium: process.env.PREMIUM,
    disabledgc : process.env.DISABLED_GRP,
    region: process.env.REGION,
    prefix: process.env.PREFIX,
    alwaysonline: process.env.ALWAYS_ONLINE,
    antibadwords: process.env.ANTI_BAD_WORDS,
}

module.exports = {
    OWNER, 
    BOT, 
    SETTINGS,
    DEVELOPER,
}