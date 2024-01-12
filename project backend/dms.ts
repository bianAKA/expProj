import { getData, setData, Data, User, dms, message } from './dataStore';
import { decodeToken, isTokenValid, isUidValid, isDmIdValid, getIndexOfDmId, extractUser, isAuthUserMember } from './helper';
import HTTPError from 'http-errors';
import { createN } from './notification';

/**
  * Given a token and a dm with dmId,
  * return first 50 messages within the channel from index 'start'.
  * - If any errors are encountered, throw error.
  * - If there are no messages, return empty array.
  * - If cannot return 50 messages, return recent messages with end = -1.
  * - Otherwise, return message array along with start and end = start + 50;
  *
  * @param {string} token - token of authorised user
  * @param {number} dmId - Id of dm
  * @param {number} start - index to start reading messages
  * @returns {message[], number, number} - message array, start index, and end index
*/

function dmMessagesV2(token: string, dmId: number, start: number): { messages: message[], start: number, end: number } {
  const data = getData();

  const dmIndex: number = data.dms.map(dm => dm.dmId).indexOf(dmId);
  if (dmIndex < 0) {
    throw HTTPError(400, 'invalid dmId');
  }

  if (start > data.dms[dmIndex].messages.length) {
    throw HTTPError(400, 'start cannot be greater than amount of messages in dm');
  }

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const authUserId: number = decodeToken(token);
  let isAuthUserInDm = false;
  for (const i in data.dms[dmIndex].members) {
    if (data.dms[dmIndex].members[i].uId === authUserId) {
      isAuthUserInDm = true;
    }
  }
  if (!isAuthUserInDm) {
    throw HTTPError(403, 'authorised user not in dm');
  }

  let end = -1;
  let messages = [...data.dms[dmIndex].messages].reverse();
  messages.forEach(message => message.uId);
  if (start + 50 > data.dms[dmIndex].messages.length) {
    messages = messages.slice(start);
    return { messages: messages, start: start, end: end };
  } else {
    end = start + 50;
    messages = messages.slice(start, end);
    return { messages: messages, start: start, end: end };
  }
}

/**
  * Given a token and an array of uIds,
  * create a DM with list of users inside members
  * and return the dmId.
  * - If any errors are encountered, return error string.
  * - If there are no errors, return dmId.
  * - If uIds array is empty return dmId with owner being the only member.
  *
  * @param {string} token - token of authorised user
  * @param {number[]} uIds - Array of uIds
  * @returns {object} - error string
  * @returns {object} - dmId: number
*/
function dmCreateV2(token: string, uIds: number[]): {error: 'error'} | {dmId: number} {
  const data: Data = getData();

  const validUid = uIds.map(isUidValid).includes(false);
  const duplicateUid = uIds.filter((item, index) => uIds.indexOf(item) !== index);

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (validUid) {
    throw HTTPError(400, 'any uId in uIds does not refer to a valid user');
  } else if (duplicateUid.length !== 0) {
    throw HTTPError(400, 'there are duplicate uId in uIds');
  }

  const authUserId: number = decodeToken(token);
  const newUids: number[] = [...uIds];
  newUids[newUids.length] = authUserId;
  const handles: string[] = data.users.filter(user => newUids.includes(user.uId)).map(i => i.handleStr).sort();

  let name: string = handles[0];

  for (const i of handles.slice(1)) {
    name = name.concat(', ' + i);
  }

  const dmId: number = data.dms.length === 0 ? 1 : data.dms[data.dms.length - 1].dmId + 1;
  const members: User[] = data.users.filter(user => newUids.includes(user.uId)).map(extractUser);

  data.dms.push({
    uIds: newUids,
    name: name,
    members: members,
    creatorId: decodeToken(token),
    messages: [],
    dmId: dmId
  });

  setData(data);
  createN(decodeToken(token), dmId, true, uIds);
  return { dmId: dmId };
}

/**
  * Given a token return then list of
  * DMs the user is in.
  * - If any errors are encountered, return error string.
  * - If there are no errors, return dmList
  *
  * @param {string} token - token of authorised user
  * @returns {object} - error string
  * @returns {object[]} - dmsList: dms[]
*/
function dmListV2(token: string): { dms: dms[] } {
  const data: Data = getData();
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  }

  const authUserId = decodeToken(token);
  const dmsList: dms[] = [];

  for (const i in data.dms) {
    for (const j in data.dms[i].members) {
      if (data.dms[i].members[j].uId === authUserId) {
        dmsList.push({
          dmId: data.dms[i].dmId,
          name: data.dms[i].name
        });
      }
    }
  }

  return { dms: dmsList };
}

/**
  * Given a token and a dmId remove the DM and all
  * members within
  * - If any errors are encountered, return error string.
  * - If there are no errors, return {}
  *
  * @param {string} token - token of authorised user
  * @param {number} dmId - Id of DM
  * @returns {object} - error string
  * @returns {} - empty object
*/
function dmRemoveV2(token: string, dmId: number): Record<string, never> {
  const data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  } else if (!isDmIdValid(dmId)) {
    throw HTTPError(400, 'any uId in uIds does not refer to a valid user');
  }

  const dmIndex: number = getIndexOfDmId(dmId);

  const userNotMember: boolean = data.dms[dmIndex].members.map(x => x.uId).includes(decodeToken(token));
  let userNotOwner = true;
  if (decodeToken(token) !== data.dms[dmIndex].creatorId) {
    userNotOwner = false;
  }

  if (!userNotOwner) {
    throw HTTPError(403, 'dmId is valid and the authorised user is not the original DM creator');
  } else if (!userNotMember) {
    throw HTTPError(403, 'dmId is valid and the authorised user is no longer in the DM');
  }

  data.dms.splice(dmIndex, 1);

  setData(data);
  return { };
}

/**
  * <This function provides basic details about the DM when given a dmId from
  * an authorized user>
  *
  * @param {string} token - token of authorized user
  * @param {number} dmId - way of classifying the DM
  * ...
  *
  * @returns {string} - Name of the DM
  * @returns {object} - List of the members within the DM
  * @returns {object} - Error case
*/
function dmDetailsV2(token: string, dmId: number) {
  const data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  if (!isDmIdValid(dmId)) {
    throw HTTPError(400, 'invalid dmid');
  }

  if (!isAuthUserMember(token, dmId)) {
    throw HTTPError(403, 'not a member');
  }

  const index = getIndexOfDmId(dmId);

  return { name: data.dms[index].name, members: data.dms[index].members };
}

/**
  * <This function removes an authorized user from a DM>
  *
  * @param {string} token - token of authorized user
  * @param {number} dmId - way of classifying the DM
  * ...
  *
  * @returns {object} - Error case
  * @returns {} - Empty return
*/
function dmLeaveV2(token: string, dmId: number): Record<string, never> {
  const data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  if (!isDmIdValid(dmId)) {
    throw HTTPError(400, 'invalid dmid');
  }

  if (!isAuthUserMember(token, dmId) && !isAuthUserMember(token, dmId)) {
    throw HTTPError(403, 'not a member');
  }

  const index: number = getIndexOfDmId(dmId);
  let userIndex: number;

  const authUserId: number = decodeToken(token);

  for (const i in data.dms[index].members) {
    if (authUserId === data.dms[index].members[i].uId) {
      userIndex = parseInt(i);
    }
  }

  if (authUserId === data.dms[index].creatorId) {
    delete data.dms[index].creatorId;
    data.dms[index].members.splice(userIndex, 1);
  } else {
    data.dms[index].members.splice(userIndex, 1);
  }

  setData(data);

  return {};
}

export { dmCreateV2, dmListV2, dmRemoveV2, dmMessagesV2, dmLeaveV2, dmDetailsV2 };
