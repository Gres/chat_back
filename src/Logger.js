class Logger {
    log(message, type = 'info', icon = 'ℹ️') {
        console.log(`${icon} [${type.toUpperCase()}] - ${new Date().toISOString()} - ${message}`);
    }
}

module.exports = new Logger();