import { getData, setData, Data } from './dataStore';
import { isTokenValid, extractIdName, authChannel, getIndexOfUser } from './helper';
import HTTPError from 'http-errors';

interface Channel {
  channelId: number,
  name: string
}

/**
  * Create a new channel while adding the authoeried user into the channel
  *
  * @param {integer} authUserId - authorised user id
  * @param {string} name - channel's name
  * @param {isPublic} boolean - channel is public or not
  *
  * @returns {integer} - authuserId is valid
  *                    - length of name is greater than 0 and less than 21 characters
  * @returns {object}  - authuserId is invalid
  *                    - legnth of name is less than 0 or more than 20 characters
*/
function channelsCreateV3(token: string, name: string, isPublic: boolean): {error: 'error'} | {channelId: number} {
  const data: Data = getData();
  const index: number = getIndexOfUser(data, token);

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (name.length < 1 || name.length > 20) {
    throw HTTPError(400, 'length of name is less than 1 or more than 20 characters');
  }

  const channelId: number = data.channels.length + 1;

  data.channels.push({
    isPublic: isPublic,
    channelId: channelId,
    ownerMembers: [{
      uId: data.users[index].uId,
      email: data.users[index].email,
      nameFirst: data.users[index].nameFirst,
      nameLast: data.users[index].nameLast,
      handleStr: data.users[index].handleStr
    }],
    allMembers: [{
      uId: data.users[index].uId,
      email: data.users[index].email,
      nameFirst: data.users[index].nameFirst,
      nameLast: data.users[index].nameLast,
      handleStr: data.users[index].handleStr
    }],
    name: name,
    messages: [],
    standupActive: false,
    standupFinish: null,
    standupUserId: undefined,
    standupBuffer: ''
  });

  setData(data);

  return { channelId: channelId };
}

/*
**
  * This function returns an array of all channels,
  * regardless of whether the channel is private or public
  *
  * @param {string} token       - token of a user
  *
  * @returns {object}           - token is valid
  * @returns {object}           - token is invalid
  *
*/
const channelsListV3 = (token: string): { channels: Channel[] } => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  return ({ channels: getData().channels.filter(channel => authChannel(channel, token)).map(extractIdName) });
};

/**
  * This function will return an array of channels
  * and their information that the authorised user is part of.
  *
  * @param {string} token - token of a user
  *
  * @returns {object}           - token is valid
  * @returns {object}           - token is invalid
  *
*/
const channelsListAllV3 = (token: string): { channels: Channel[] } => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  return ({ channels: getData().channels.map(extractIdName) });
};

export { channelsListV3, channelsListAllV3, channelsCreateV3 };
