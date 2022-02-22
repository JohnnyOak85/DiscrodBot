import { MessageEmbed } from 'discord.js';

import { getDoc } from './storage.helper';

interface Embed {
  description: string;
  title: string;
}

export const getEmbed = async (embed: string) => {
  const doc = await getDoc<any>('configurations/embeds');

  return new MessageEmbed(doc[embed]);
};

export const buildEmbed = (embed: Embed, color: string, path?: string) =>
  new MessageEmbed(embed).setColor(color || 'DEFAULT').setThumbnail(path || '');
