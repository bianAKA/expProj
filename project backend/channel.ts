import { getData, setData, Data, message } from './dataStore';
import { isTokenValid, decodeToken, isUidValid, getUId } from './helper';
import { createN } from './notification';
import HTTPError from 'http-errors';

/**
  * Given user token who is a member of channel with channelId,
  * invite user with uId to join the respective channel.
  * - If successful, return empty object.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of inviter
  * @param {number} channelId - Id of channel
  * @param {number} uId - user Id of invitee
  * @returns {} - successful invite return
*/

function channelInviteV3(token: string, channelId: number, uId: number): Record<string, never> {
  const data: Data = getData();

  const channelIndex: number = data.channels.map(channel => channel.channelId).indexOf(channelId);
  const userIndex: number = data.users.map(user => user.uId).indexOf(uId);
  if (channelIndex < 0) {
    throw HTTPError(400, 'invalid channelId');
  }
  if (userIndex < 0) {
    throw HTTPError(400, 'invited user does not exist');
  }

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const authUserId: number = decodeToken(token);
  let isUserInChannel = false;
  let isAuthUserInChannel = false;
  for (const i in data.channels[channelIndex].allMembers) {
    if (data.channels[channelIndex].allMembers[i].uId === uId) {
      isUserInChannel = true;
    }
    if (data.channels[channelIndex].allMembers[i].uId === authUserId) {
      isAuthUserInChannel = true;
    }
  }
  if (isUserInChannel) {
    throw HTTPError(400, 'invited user already in channel');
  }
  if (!isAuthUserInChannel) {
    throw HTTPError(403, 'authorised user not in channel');
  }

  data.channels[channelIndex].allMembers.push({
    uId: data.users[userIndex].uId,
    email: data.users[userIndex].email,
    nameFirst: data.users[userIndex].nameFirst,
    nameLast: data.users[userIndex].nameLast,
    handleStr: data.users[userIndex].handleStr
  });
  setData(data);
  createN(getUId(token), channelId, false, uId);
  return {};
}

/**
  * Given an token and a channel with channelId,
  * return first 50 messages within the channel from index 'start'.
  * - If any errors are encountered, throw error.
  * - If there are no messages, return empty array.
  * - If cannot return 50 messages, return recent messages with end = -1.
  * - Otherwise, return message array along with start and end = start + 50;
  *
  * @param {string} token - token of authorised user
  * @param {number} channelId - Id of channel
  * @param {number} start - index to start reading messages
  * @returns {message[], number, number} - message array, start index, and end index
*/

function channelMessagesV3(token: string, channelId: number, start: number): { messages: message[], start: number, end: number } {
  const data: Data = getData();

  const channelIndex: number = data.channels.map(channel => channel.channelId).indexOf(channelId);
  if (channelIndex < 0) {
    throw HTTPError(400, 'invalid channelId');
  }

  if (start > data.channels[channelIndex].messages.length) {
    throw HTTPError(400, 'start cannot be greater than amount of messages in channel');
  }

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const authUserId: number = decodeToken(token);
  let isAuthUserInChannel = false;
  for (const i in data.channels[channelIndex].allMembers) {
    if (data.channels[channelIndex].allMembers[i].uId === authUserId) {
      isAuthUserInChannel = true;
    }
  }
  if (!isAuthUserInChannel) {
    throw HTTPError(403, 'authorised user not in channel');
  }

  let end = -1;
  let messages = [...data.channels[channelIndex].messages].reverse();
  messages.forEach(message => message.uId);
  if (start + 50 > data.channels[channelIndex].messages.length) {
    messages = messages.slice(start);
    return { messages: messages, start: start, end: end };
  } else {
    end = start + 50;
    messages = messages.slice(start, end);
    return { messages: messages, start: start, end: end };
  }
}

/**
  * <channelDetailsV3 shows basic details about a channel that authorised user is a part of>
  *
  * @param {string} token - A string that identifies an authorised user for the session
  * @param {number} channelId - A number that identifies a channel
  *
  * @returns {string} - Returns if there is an error such as user not being in channel
  * @returns {object} - Returns details of channel if fulfills all conditions
*/

function channelDetailsV3(token: string, channelId: number) {
  const data = getData();

  let channelValid = false;
  let authUserInChannel = false;
  let index = 0;
  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  const uId = decodeToken(token);
  for (let i = 0; i < data.channels.length; i++) {
    if (channelId === data.channels[i].channelId) {
      channelValid = true;
      index = i;
    }
  }

  for (let i = 0; i < data.channels[index].ownerMembers.length; i++) {
    if (uId === data.channels[index].ownerMembers[i].uId) {
      authUserInChannel = true;
    }
  }

  for (let i = 0; i < data.channels[index].allMembers.length; i++) {
    if (uId === data.channels[index].allMembers[i].uId) {
      authUserInChannel = true;
    }
  }

  if (!channelValid || !authUserInChannel) {
    throw HTTPError(400);
  }
  return {
    name: data.channels[index].name,
    isPublic: data.channels[index].isPublic,
    ownerMembers: data.channels[index].ownerMembers,
    allMembers: data.channels[index].allMembers
  };
}
/**
  * <channelJoinV3 adds an authorised user to the channel>
  *
  * @param {string} token - A string that identifies an authorised user for the session
  * @param {number} channelId - A number that identifies a channel
  *
  *
  * @returns {} - Returns if there are no errors
  * @returns {string} - Returns if there are errors such as invalid channelId or token
*/

function channelJoinV3(token: string, channelId: number): Record<string, never> {
  const data: Data = getData();
  let channelValid = false;
  let globalValidCheck = false;
  let index = 0;
  let index1 = 0;

  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }

  const uId:number = decodeToken(token);

  for (let i = 0; i < data.channels.length; i++) {
    if (channelId === data.channels[i].channelId) {
      channelValid = true;
      index = i;
    }
  }

  for (let i = 0; i < data.channels[index].allMembers.length; i++) {
    if (data.channels[index].allMembers[i].uId === uId) {
      throw HTTPError(400);
    }
  }
  for (let i = 0; i < data.users.length; i++) {
    if (uId === data.users[i].uId) {
      index1 = i;
    }
  }

  if (typeof data.permissions === 'undefined' && uId === data.users[0].uId) {
    globalValidCheck = true;
  }
  if (typeof data.permissions !== 'undefined') {
    if (data.permissions.includes(uId)) {
      globalValidCheck = true;
    }
  }

  if (!channelValid) {
    throw HTTPError(400);
  }
  if (!data.channels[index].isPublic && !globalValidCheck) {
    throw HTTPError(400);
  }

  data.channels[index].allMembers.push({
    uId: data.users[index1].uId,
    email: data.users[index1].email,
    nameFirst: data.users[index1].nameFirst,
    nameLast: data.users[index1].nameLast,
    handleStr: data.users[index1].handleStr
  });
  setData(data);
  return {};
}
/**
  * <channelLeaveV2> removes user as member of channel
  *
  * @param {string} token - A string that identifies an authorised user for the session
  * @param {number} channelId - A number that identifies a channel
  *
  *
  * @returns {} - Returns if there are no errors
  * @returns {string} - Returns if there are errors such as invalid channelId or token
*/

function channelLeaveV2(token: string, channelId: number): Record<string, never> | { error: string } {
  const data: Data = getData();
  let channelValid = false;
  let index = 0;
  if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  // Finding index of channel
  for (let i = 0; i < data.channels.length; i++) {
    if (channelId === data.channels[i].channelId) {
      channelValid = true;
      index = i;
      break;
    }
  }
  if (!channelValid) {
    throw HTTPError(400);
  }
  const targetUId:number = decodeToken(token);

  let memberInChannel = false;

  for (let index3 = 0; index3 < data.channels[index].allMembers.length; index3++) {
    if (data.channels[index].allMembers[index3].uId === targetUId) {
      data.channels[index].allMembers.splice(index3);
      memberInChannel = true;
      break;
    }
  }
  for (let index3 = 0; index3 < data.channels[index].ownerMembers.length; index3++) {
    if (data.channels[index].ownerMembers[index3].uId === targetUId) {
      data.channels[index].ownerMembers.splice(index3);
      memberInChannel = true;
      break;
    }
  }

  if (!memberInChannel) {
    throw HTTPError(400);
  }
  for (let index2 = 0; index2 < data.channels[index].ownerMembers.length; index2++) {
    if (data.channels[index].ownerMembers[index2].uId === targetUId) {
      data.channels[index].ownerMembers.splice(index2);
      break;
    }
  }

  setData(data);
  return {};
}

/**
  * <channelAddOwnerV2> adds user as owner of channel
  *
  * @param {string} token - A string that identifies an authorised user for the session
  * @param {number} channelId - A number that identifies a channel
  * @param {number} uId - A number that identifies an authorised user
  *
  * @returns {} - Returns if there are no errors
  * @returns {string} - Returns if there are errors such as invalid channelId or token
*/

function channelAddOwnerV2(token:string, channelId:number, uId: number): Record<string, never> | { error: string } {
  const data: Data = getData();
  let channelValid = false;
  let memberInChannel = false;
  let i = 0;
  let index2 = 0;
  let ownerPermissions = false;
  // Finding index of channel
  for (i = 0; i < data.channels.length; i++) {
    if (data.channels[i].channelId === channelId) {
      channelValid = true;
      break;
    }
  }
  if (!channelValid || !isUidValid(uId)) {
    throw HTTPError(400);
  } if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  for (let index = 0; index < data.channels[i].ownerMembers.length; index++) {
    if (data.channels[i].ownerMembers[index].uId === uId) {
      throw HTTPError(400);
    }
    if (data.channels[i].ownerMembers[index].uId === decodeToken(token)) {
      ownerPermissions = true;
    }
  }
  for (index2; index2 < data.channels[i].allMembers.length; index2++) {
    if (data.channels[i].allMembers[index2].uId === uId) {
      memberInChannel = true;
      break;
    }
  }
  if (!memberInChannel || !ownerPermissions) {
    throw HTTPError(400);
  }
  data.channels[i].ownerMembers.push(data.channels[i].allMembers[index2]);
  setData(data);
  return {};
}
/**
  * <channelRemoveOwnerV2> removes user as owner of channel
  *
  * @param {string} token - A string that identifies an authorised user for the session
  * @param {number} channelId - A number that identifies a channel
  * @param {number} uId - A number that identifies an authorised user
  *
  * @returns {} - Returns if there are no errors
  * @returns {string} - Returns if there are errors such as invalid channelId or token
*/
function channelRemoveOwnerV2(token:string, channelId:number, uId: number): Record<string, never> | { error: string } {
  const data: Data = getData();
  let channelValid = false;
  let memberInChannel = false;
  let isOwner = false;
  let ownerPermissions = false;
  let i = 0;
  let index = 0;
  // Finding index of channel
  for (i = 0; i < data.channels.length; i++) {
    if (data.channels[i].channelId === channelId) {
      channelValid = true;
      break;
    }
  }
  if (!channelValid || !isUidValid(uId)) {
    throw HTTPError(400);
  } if (!isTokenValid(token)) {
    throw HTTPError(403);
  }
  for (index; index < data.channels[i].ownerMembers.length; index++) {
    if (data.channels[i].ownerMembers[index].uId === decodeToken(token)) {
      ownerPermissions = true;
    }
    if (data.channels[i].ownerMembers[index].uId === uId) {
      isOwner = true;
      break;
    }
  }
  for (let index2 = 0; index2 < data.channels[i].allMembers.length; index2++) {
    if (data.channels[i].allMembers[index2].uId === uId) {
      memberInChannel = true;
      break;
    }
  }
  if (!memberInChannel || !ownerPermissions || data.channels[i].ownerMembers.length === 1 || !isOwner) {
    throw HTTPError(400);
  }
  data.channels[i].ownerMembers.splice(index);
  setData(data);
  return {};
}

export { channelDetailsV3, channelJoinV3, channelLeaveV2, channelAddOwnerV2, channelRemoveOwnerV2, channelMessagesV3, channelInviteV3 };
