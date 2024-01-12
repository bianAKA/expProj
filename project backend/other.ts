import { getData, setData, message, User } from './dataStore';
import { isTokenValid, decodeToken } from './helper';
import { setNotification } from './notification';
import HTTPError from 'http-errors';

export function clearV1() {
  setData({
    users: [],
    channels: [],
    dms: [],
    permissions: [],
    removedUsers: []
  });

  setNotification({
    info: []
  });

  return {};
}
/**
  * Given a user token and a query string,
  * find any message within the channels/dms that the authorised user
  * has joined that contains the query string.
  * - If any errors are encountered, throw error.
  * - If successful, return messages array holding messages that contain query string;
  *
  * @param {string} token - token of authorised user
  * @param {string} queryStr - query string
  * @returns {message[]} - message array
*/

export function searchV1(token: string, queryStr: string): {messages: message[]} {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  if (queryStr.length < 1) {
    throw HTTPError(400, 'query string cannot be below 1 character');
  } else if (queryStr.length > 1000) {
    throw HTTPError(400, 'query string cannot be over 1000 characters');
  }

  const messages: message[] = [];
  const authUserId: number = decodeToken(token);
  for (const i in data.channels) {
    if (data.channels[i].allMembers.map(member => member.uId).includes(authUserId)) {
      for (const j in data.channels[i].messages) {
        if ((data.channels[i].messages[j].message.toLowerCase()).includes(queryStr.toLowerCase())) {
          messages.push(data.channels[i].messages[j]);
        }
      }
    }
  }
  for (const i in data.dms) {
    if (data.dms[i].members.map((member: User) => member.uId).includes(authUserId)) {
      for (const j in data.dms[i].messages) {
        if ((data.dms[i].messages[j].message.toLowerCase()).includes(queryStr.toLowerCase())) {
          messages.push(data.dms[i].messages[j]);
        }
      }
    }
  }
  return { messages: messages };
}
