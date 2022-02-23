import { GuildMember, PartialGuildMember, User } from 'discord.js';
import { difference } from 'lodash';

import { compareDate, getDate } from './utils.helper';
import { docExists, findDoc, getDoc, saveDoc } from './database.helper';
import { StoryFactory } from '../factories/story.factory';

interface UserDoc {
  _id?: string;
  anniversary?: Date;
  attack?: number;
  defense?: number;
  joinedAt?: Date | null;
  health?: number;
  level?: number;
  nickname?: string | null;
  roles?: string[];
  strikes?: string[];
  timer?: string;
  username?: string;
}

interface BannedUser {
  user: User;
  reason: string;
}

export const ensureUser = (user: UserDoc, member: GuildMember) => {
  user._id = user._id || member.id;
  user.joinedAt = user.joinedAt || member.joinedAt;
  user.nickname = user.nickname || member.nickname;
  user.roles = user.roles?.length ? user.roles : member.roles.cache.map((role) => role.id);
  user.username = user.username || member.user.username;

  return user;
};

const getStory = (nickname: string) => {
  const storyFactory = new StoryFactory(nickname);

  return storyFactory.getStory();
};

export const buildBannedUser = (user: User, reason: string) => {
  return {
    _id: user.id,
    joinedAt: null,
    nickname: null,
    roles: [],
    strikes: [reason],
    username: user.username
  };
};

export const recordBannedUser = (user: BannedUser, guild: string) =>
  docExists(guild, user.user.id).then((bool) =>
    bool ? saveDoc(buildBannedUser(user.user, user.reason), guild, user.user.id) : null
  );

export const updateUser = () => {};

export const getUser = (member: GuildMember) =>
  getDoc<UserDoc>(member.guild.id, member.user.id).then((doc) => ensureUser(doc, member));

export const findUser = (guild: string, user: string) => findDoc<UserDoc>(guild, user);
export const saveUser = (member: GuildMember, doc: UserDoc) => saveDoc(doc, member.guild.id, member.user.id);

export const getUserByUsername = (guildId: string, username: string) => findDoc<UserDoc>(guildId, username);

export const checkMember = (moderator: GuildMember, member: GuildMember) => {
  if (!member) {
    return 'You need to mention a valid user.';
  }

  if (moderator.user.id === member.user.id) {
    return 'You cannot moderate yourself!';
  }

  if (!member.manageable) {
    return `You cannot moderate ${member.user.username}.`;
  }
};

export const addUserAnniversary = async (member: GuildMember, date: Date) => {
  try {
    const user = await getUser(member);
    user.anniversary = date;

    saveDoc(user, member.guild.id, member.user.id);

    return `The anniversary of ${member.displayName} has been recorded.\n${getDate(date, 'MMMM Do YYYY')}`;
  } catch (error) {
    throw error;
  }
};

export const checkMemberChanges = async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
  try {
    const user = await getUser(newMember);
    const newRole = difference(oldMember.roles.cache.array(), newMember.roles.cache.array());

    if (newRole.length) {
      user.roles?.push(newRole[0].id);
    }

    user.nickname = newMember.manageable && newMember.nickname ? newMember.nickname : '';

    saveDoc(user, newMember.guild.id, newMember.user.id);
  } catch (error) {
    throw error;
  }
};

export const registerMember = async (member: GuildMember) => {
  try {
    if (member.user.bot) return;

    const user = await getUser(member);

    user.nickname = member.manageable && member.nickname ? member.nickname : '';

    if (!member.joinedAt || !user.joinedAt || !compareDate(member.joinedAt, user.joinedAt)) {
      member.guild.systemChannel?.send(
        `Welcome <@${member.user.id}>! Have a story:\n${await getStory(member.nickname || member.displayName)}`
      );

      return;
    }

    user.roles = user.roles || [];

    for (const role of user.roles) {
      if (await member.guild.roles.fetch(role)) {
        member.roles.add(role);
      }
    }

    if (user.nickname) {
      member.setNickname(user.nickname);
    }

    member.guild.systemChannel?.send(`Rejoice! <@${member.user.id}> is back!`);
  } catch (error) {
    throw error;
  }
};
