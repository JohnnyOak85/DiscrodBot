module.exports = {
    name: 'banned',
    description: 'Lists all the users that have been banned.',
    usage: ' ',
    moderation: true,
    async execute(message, args, commandHelper) {
        commandHelper.start(message, args);
        if (commandHelper.verifyUser('BAN_MEMBERS')) {
            const bannedList = await commandHelper.fetchBans();
            if (bannedList) {
                let message = '';
                bannedList.array().forEach(i => {
                    let reason = 'No reason provided';
                    if (i.reason) reason = i.reason;
                    message += `${i.user.username}: ${reason}\n`
                })
                commandHelper.setReply(message);
            }
        }
        message.channel.send(commandHelper.getReply());
    }
}