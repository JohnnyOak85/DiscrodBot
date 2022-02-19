import { Guild, GuildChannelManager, MessageEmbed, NewsChannel, PermissionOverwriteOption, Role, TextChannel } from 'discord.js';

import { logInfo } from './utils.helper';
import { getDoc } from './storage.helper';
import { collectReactions } from './reaction.helper';

import { RULE_LIST } from '../config.json';

interface ChannelSchema {
  name: string;
  options: {
    parent?: string;
    permissions: PermissionOverwriteOption;
    position: number;
    type: 'category' | 'text' | 'voice';
  };
}

/**
 * @description Sets up an embed with color emotes to give color roles to users.
 */
const setColorRoles = async (channel: TextChannel | NewsChannel) => {
  try {
    const colorEmbed = new MessageEmbed({
      color: 'DEFAULT',
      title: 'React to pick your color.'
    });

    const messages = await channel.messages.fetch();
    const colorEmojis = await getDoc<EmojiMap>('configurations/emojis/colors');

    if (!messages.array().length) {
      const message = await channel.send(colorEmbed);

      collectReactions(message, colorEmojis);

      return;
    }

    const previous = messages.array().find((message) => message.embeds.filter((embed) => embed.title === colorEmbed.title));

    if (!previous) {
      const message = await channel.send(colorEmbed);

      collectReactions(message, colorEmojis);
    }

    for await (const message of messages.array()) {
      collectReactions(message, colorEmojis);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * @description Creates a new channel in the information category.
 */
const buildInfoChannel = async (guild: Guild, channelName: string) => {
  try {
    if (!guild.systemChannel) return;

    const channel = await getChannel(guild.channels, channelName, guild.systemChannel);
    const category = await getChannel(guild.channels, 'information', guild.systemChannel);

    if (!channel || !category) return;

    await channel.setParent(category.id);

    return channel;
  } catch (error) {
    throw error;
  }
};

/**
 * @description Sends a message with the rules list to the system channel.
 */
export const setRules = async (channel: TextChannel | NewsChannel, rules: string[]) => {
  try {
    let reply = '```markdown\n';

    for (const rule of rules) {
      reply += `* ${rule}\n`;
    }

    reply += '```';

    const messages = await channel.messages.fetch();

    for await (const message of messages.array()) {
      if (message.content !== reply) {
        message.delete();
      }
    }

    if (!messages.array().length) {
      channel.send(reply);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * @description Creates a new channel on the guild.
 */
const createChannel = async (channelManager: GuildChannelManager, channelName: string, systemChannel: TextChannel) => {
  try {
    const channelSchema = await getDoc<ChannelSchema>(`configurations/channels/${channelName}`);
    const channel = await channelManager.create(channelSchema.name, channelSchema.options);

    systemChannel.send(`Created new channel <#${channel?.id}>!`);
    logInfo(`Created channel ${channelSchema.name} on ${channelManager?.guild.name}.`);

    return channel;
  } catch (error) {
    throw error;
  }
};

/**
 * @description Creates the information category.
 */
export const buildInfoCategory = async (guild: Guild) => {
  try {
    const rulesChannel = await buildInfoChannel(guild, 'rules');

    if (rulesChannel && rulesChannel.isText()) {
      setRules(rulesChannel, RULE_LIST);
    }

    const eventsChannel = await buildInfoChannel(guild, 'events');

    if (eventsChannel) {
      guild.setSystemChannel(eventsChannel);
    }

    const rolesChannel = await buildInfoChannel(guild, 'roles');

    if (rolesChannel && rolesChannel.isText()) {
      setColorRoles(rolesChannel);
    }
  } catch (error) {
    throw error;
  }
};

/**
 * @description Retrieves a new channel from the guild.
 */
export const getChannel = async (channelManager: GuildChannelManager, channelName: string, systemChannel: TextChannel) => {
  try {
    const channel = channelManager.cache.find((guildChannel) => guildChannel.name === channelName);

    if (!channel) {
      return await createChannel(channelManager, channelName, systemChannel);
    }

    return channel;
  } catch (error) {
    throw error;
  }
};

/**
 * @description Updates permissions of a channel by given role.
 */
export const updatePermissions = async (
  channelManager: GuildChannelManager,
  role: Role,
  permissions: PermissionOverwriteOption
) => {
  for (const channel of channelManager.cache.array()) {
    channel.updateOverwrite(role, permissions);
  }
};
