import { getData, setData, Data, react } from './dataStore';
import HTTPError from 'http-errors';
import { messageN, reactN } from './notification';
import {
  isTokenValid,
  isDmIdValid,
  isAuthUserMember,
  isAuthUserCreator,
  generateMessageId,
  sendingDm,
  decodeToken,
  isMessageIdValid,
  getMessage,
  isReacted,
  getUId,
  isPinned,
  isPermitted
} from './helper';

interface MessageId {
  messageId: number
}

/**
  * Send a message from authorised user to the DM specified by dmId.
  *
  * @param {string} token       - token of the user
  * @param {string} message     - message
  * @param {number} dmId        - dmId
  *
  * @returns {object}           - token is invalid
  * @returns {object}           - dmId is invalid
  * @returns {object}           - message is too long or no message
  * @returns {object}           - dmId is valid and the authorised user is not a member of the DM
  * @returns {      }           - updated handle string successfully
  *
*/
const messageSendDmV2 = (token: string, dmId: number, message: string): MessageId | Error => {
  if (!isDmIdValid(dmId)) {
    throw HTTPError(400, 'dmId does not refer to a valid DM');
  } else if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (message.length < 1 || message.length > 1000) {
    throw HTTPError(400, 'length of message is less than 1 or over 1000 characters');
  } else if (!isAuthUserMember(token, dmId) && !isAuthUserCreator(token, dmId)) {
    throw HTTPError(403, 'dmId is valid and the authorised user is not a member of the DM');
  }

  const newMessageId: number = generateMessageId();
  setData(sendingDm(getData(), message, newMessageId, dmId, token));
  messageN(message, getUId(token), true, dmId);

  return ({ messageId: newMessageId });
};

/**
  * Given user token, messageId and reactId
  * add the given react to the specific message Id
  * - If successful, return empty object.
  * - If any errors are encountered, then thow then error
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of message
  * @param {number} reactId - Id of reactions
  *
  * @returns {string} - error string
  * @returns {} - successful return
*/
const messageReactV1 = (token: string, messageId: number, reactId: number) => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!isMessageIdValid(token, messageId)) {
    throw HTTPError(400, 'invalid message id');
  } else if (reactId !== 1) {
    throw HTTPError(400, 'invalid reactId');
  } else if (isReacted(token, messageId)) {
    throw HTTPError(400, 'is reacted by the same user');
  }

  const data: Data = getData();
  const text = getMessage(messageId);

  let channel = -1;
  let dm = -1;
  if (text.platform === 'dms') {
    dm = text.info.dmId;
  } else {
    channel = text.info.channelId;
  }

  if (data[text.platform][text.platformIndex].messages[text.messageIndex].hasOwnProperty('reactInfo')) {    // eslint-disable-line
    data[text.platform][text.platformIndex].messages[text.messageIndex].reactInfo.push({
      reactId: reactId,
      authUId: getUId(token),
      reacting: true
    });
  } else {
    data[text.platform][text.platformIndex].messages[text.messageIndex].reactInfo = [{
      reactId: reactId,
      authUId: getUId(token),
      reacting: true
    }];
  }

  setData(data);
  reactN(channel, dm, getUId(token), text.info.messages[text.messageIndex].uId, text);
  return { };
};

/**
  * Given user token, messageId and reactId
  * unreacts to the specific message Id
  * - If successful, return empty object.
  * - If any errors are encountered, then throw HTTPError
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of message
  * @param {number} reactId - Id of reactions
  *
  * @returns {string} - error string
  * @returns {} - successful return
*/
const messageUnreactV1 = (token: string, messageId: number, reactId: number) => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!isMessageIdValid(token, messageId)) {
    throw HTTPError(400, 'invalid message id');
  } else if (reactId !== 1) {
    throw HTTPError(400, 'invalid reactId');
  }
  const data: Data = getData();
  const text = getMessage(messageId);
  const currReactInfo = data[text.platform][text.platformIndex].messages[text.messageIndex];
  if (typeof currReactInfo.reactInfo === 'undefined') {
    throw HTTPError(400);
  }
  let i = 0;
  for (i; i < currReactInfo.reactInfo.length; i++) {
    if (currReactInfo.reactInfo.map((info: react) => info.authUId).includes(getUId(token))) {
      if (currReactInfo.reactInfo[i].reacting === true) {
        currReactInfo.reactInfo.splice(i);

        break;
      }
    }
  }

  setData(data);
  return {};
};

/**
  * Given user token, messageId
  * then pin that message
  * - If successful, return empty object.
  * - If any errors are encountered, then thow then error
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of message
  *
  * @returns {string} - error string
  * @returns {} - successful return
*/
const messagePinV1 = (token: string, messageId: number) => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!isMessageIdValid(token, messageId)) {
    throw HTTPError(400, 'invalid message id');
  } else if (isPinned(messageId)) {
    throw HTTPError(400, 'pinned already');
  } else if (!isPermitted(token, messageId)) {
    throw HTTPError(403, 'valid message id but user does not have permissions');
  }

  const relevantMessage = getMessage(messageId);
  const key: string = relevantMessage.platform;
  const index: number = relevantMessage.platformIndex;
  const messageIndex: number = relevantMessage.messageIndex;

  const data: Data = getData();
  data[key][index].messages[messageIndex].pin = true;
  setData(data);

  return ({ });
};

/**
  * Given a user token who is a member of either the
  * channel with channelId or the dm with dmId,
  * a message to be sent to the channel/dm, and the
  * messageId of the message to be shared.
  *
  * Shares a message to the channel/dm, along with
  * the optional message.
  * - If successful, return messageId of shared message.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} ogMessageId - Id of message to be shared
  * @param {string} message - optional message to be sent
  * @param {number} channelId - Id of channel
  * @param {number} dmId - Id of dm
  * @returns {number} - messageId on successful return
*/
function messageShareV1(token: string, ogMessageId: number, message: string, channelId: number, dmId: number) {
  const data = getData();

  const channelIndex: number = data.channels.map(channel => channel.channelId).indexOf(channelId);
  const dmIndex: number = data.dms.map(dm => dm.dmId).indexOf(dmId);
  if (channelIndex < 0 && dmIndex < 0) {
    throw HTTPError(400, 'channel and dm cannot both be invalid');
  } else if (channelIndex >= 0 && dmIndex >= 0) {
    throw HTTPError(400, 'either channelId or dmId must be -1');
  }

  let sharedMessage: string;
  let doesMessageExist = false;
  for (const i in data.channels) {
    for (const j in data.channels[i].messages) {
      if (data.channels[i].messages[j].messageId === ogMessageId) {
        sharedMessage = data.channels[i].messages[j].message;
        doesMessageExist = true;
      }
    }
  }
  for (const i in data.dms) {
    for (const j in data.dms[i].messages) {
      if (data.dms[i].messages[j].messageId === ogMessageId) {
        sharedMessage = data.dms[i].messages[j].message;
        doesMessageExist = true;
      }
    }
  }
  if (!doesMessageExist) {
    throw HTTPError(400, 'invalid original messageId');
  }

  const authUserId: number = decodeToken(token);
  let isAuthUserInChannel = false;
  let isAuthUserInDm = false;
  if (channelIndex >= 0) {
    for (const i in data.channels[channelIndex].allMembers) {
      if (data.channels[channelIndex].allMembers[i].uId === authUserId) {
        isAuthUserInChannel = true;
      }
    }
    if (!isAuthUserInChannel) {
      throw HTTPError(403, 'authorised user not in channel');
    }
  } else if (dmIndex >= 0) {
    for (const i in data.dms[dmIndex].members) {
      if (data.dms[dmIndex].members[i].uId === authUserId) {
        isAuthUserInDm = true;
      }
    }
    if (!isAuthUserInDm) {
      throw HTTPError(403, 'authorised user not in dm');
    }
  }

  if (message.length > 1000) {
    throw HTTPError(400, 'optional message cannot be over 1000 characters');
  }

  sharedMessage += message;
  const sharedMessageId: number = generateMessageId();
  if (channelIndex >= 0) {
    data.channels[channelIndex].messages.push({
      messageId: sharedMessageId,
      uId: authUserId,
      message: sharedMessage,
      timeSent: Math.floor((new Date()).getTime() / 1000),
      pin: false,
    });
  } else if (dmIndex >= 0) {
    data.dms[dmIndex].messages.push({
      messageId: sharedMessageId,
      uId: authUserId,
      message: sharedMessage,
      timeSent: Math.floor((new Date()).getTime() / 1000),
      pin: false,
    });
  }

  setData(data);

  if (channelIndex >= 0) {
    messageN(sharedMessage, getUId(token), false, data.channels[channelIndex].channelId);
  } else if (dmIndex >= 0) {
    messageN(sharedMessage, getUId(token), true, data.dms[dmIndex].dmId);
  }

  return { sharedMessageId: sharedMessageId };
}

/**
  * Given a user token who is a member of the dm with dmId,
  * a message to be sent to the dm, and the time when the message
  * should be sent.
  *
  * Sends the message at that specific time.
  * - If successful, return messageId of sent message.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} dmId - Id of dm
  * @param {string} message - message to be sent
  * @param {number} timeSent - time when message should be sent
  * @returns {number} - messageId on successful return
*/
function messageSendLaterDmV1(token: string, dmId: number, message: string, timeSent: number) {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const dmIndex: number = data.dms.map(dm => dm.dmId).indexOf(dmId);
  if (dmIndex < 0) {
    throw HTTPError(400, 'invalid dmId');
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

  if (message.length < 1) {
    throw HTTPError(400, 'message string cannot be below 1 character');
  } else if (message.length > 1000) {
    throw HTTPError(400, 'message string cannot be over 1000 characters');
  }

  const timePeriod: number = timeSent - Math.floor((new Date()).getTime() / 1000);
  if (timePeriod < 0) {
    throw HTTPError(400, 'time cannot be in the past');
  }

  const messageId: number = generateMessageId();
  setTimeout(() => {
    data.dms[dmIndex].messages.push({
      messageId: messageId,
      uId: authUserId,
      message: message,
      timeSent: timeSent,
      pin: false,
    });
    setData(data);
    messageN(message, getUId(token), true, data.dms[dmIndex].dmId);
  }, timePeriod * 1000);
  return { messageId: messageId };
}

/**
  * Given a user token who is a member of the channel with channelId,
  * a message to be sent to the channel, and the time when the message
  * should be sent.
  *
  * Sends the message at that specific time.
  * - If successful, return messageId of sent message.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} channelId - Id of channel
  * @param {string} message - message to be sent
  * @param {number} timeSent - time when message should be sent
  * @returns {number} - messageId on successful return
*/
function messageSendLaterV1(token: string, channelId: number, message: string, timeSent: number) {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const channelIndex: number = data.channels.map(channel => channel.channelId).indexOf(channelId);
  if (channelIndex < 0) {
    throw HTTPError(400, 'invalid channelId');
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

  if (message.length < 1) {
    throw HTTPError(400, 'message string cannot be below 1 character');
  } else if (message.length > 1000) {
    throw HTTPError(400, 'message string cannot be over 1000 characters');
  }

  const timePeriod: number = timeSent - Math.floor((new Date()).getTime() / 1000);
  if (timePeriod < 0) {
    throw HTTPError(400, 'time cannot be in the past');
  }

  const messageId: number = generateMessageId();
  setTimeout(() => {
    data.channels[channelIndex].messages.push({
      messageId: messageId,
      uId: authUserId,
      message: message,
      timeSent: timeSent,
      pin: false,
    });
    setData(data);
    messageN(message, getUId(token), false, data.channels[channelIndex].channelId);
  }, timePeriod * 1000);
  return { messageId: messageId };
}

/**
  * Given a user token and a messageId,
  * remove the message that corresponds to the messageId.
  * - If successful, return empty object.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of channel
  * @returns {} - successful return
*/

function messageRemoveV2(token: string, messageId: number): Record<string, never> {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  let channelIndex = -1;
  let dmIndex = -1;
  let messageIndex = -1;
  for (const i in data.channels) {
    for (const j in data.channels[i].messages) {
      if (data.channels[i].messages[j].messageId === messageId) {
        channelIndex = parseInt(i);
        messageIndex = parseInt(j);
      }
    }
  }
  for (const i in data.dms) {
    for (const j in data.dms[i].messages) {
      if (data.dms[i].messages[j].messageId === messageId) {
        dmIndex = parseInt(i);
        messageIndex = parseInt(j);
      }
    }
  }
  if (messageIndex < 0) {
    throw HTTPError(400, 'invalid messageId');
  }

  const authUserId: number = decodeToken(token);
  if (channelIndex >= 0) {
    if (data.channels[channelIndex].messages[messageIndex].uId !== authUserId &&
        !data.channels[channelIndex].ownerMembers.map(user => user.uId).includes(authUserId)) {
      throw HTTPError(403, 'authorised user not owner or message poster');
    }
    data.channels[channelIndex].messages.splice(messageIndex, 1);
  } else if (dmIndex >= 0) {
    if (data.dms[dmIndex].messages[messageIndex].uId !== authUserId &&
        !data.dms[dmIndex].members.map(user => user.uId).includes(authUserId)) {
      throw HTTPError(403, 'authorised user not owner or message poster');
    }
    data.dms[dmIndex].messages.splice(messageIndex, 1);
  }
  setData(data);
  return {};
}

/**
  * Given a user token and a messageId,
  * replace the message that corresponds to the messageId
  * with the message given.
  * - If successful, return empty object.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of channel
  * @param {string} message - message to be sent
  * @returns {} - successful return
*/

function messageEditV2(token: string, messageId: number, message: string): Record<string, never> {
  const data = getData();

  if (message.length > 1000) {
    throw HTTPError(400, 'message string cannot be over 1000 characters');
  }

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  let channelIndex = -1;
  let dmIndex = -1;
  let messageIndex = -1;
  for (const i in data.channels) {
    for (const j in data.channels[i].messages) {
      if (data.channels[i].messages[j].messageId === messageId) {
        channelIndex = parseInt(i);
        messageIndex = parseInt(j);
      }
    }
  }
  for (const i in data.dms) {
    for (const j in data.dms[i].messages) {
      if (data.dms[i].messages[j].messageId === messageId) {
        dmIndex = parseInt(i);
        messageIndex = parseInt(j);
      }
    }
  }
  if (messageIndex < 0) {
    throw HTTPError(400, 'invalid messageId');
  }

  const authUserId: number = decodeToken(token);
  if (channelIndex >= 0) {
    if (data.channels[channelIndex].messages[messageIndex].uId !== authUserId &&
        !data.channels[channelIndex].ownerMembers.map(user => user.uId).includes(authUserId)) {
      throw HTTPError(403, 'authorised user not owner or message poster');
    }
    if (message.length === 0) {
      messageRemoveV2(token, messageId);
    } else {
      data.channels[channelIndex].messages[messageIndex].message = message;

      setData(data);
      messageN(message, getUId(token), false, data.channels[channelIndex].channelId);
    }
  } else if (dmIndex >= 0) {
    if (data.dms[dmIndex].messages[messageIndex].uId !== authUserId &&
        !data.dms[dmIndex].members.map(user => user.uId).includes(authUserId)) {
      throw HTTPError(403, 'authorised user not owner or message poster');
    }
    if (message.length === 0) {
      messageRemoveV2(token, messageId);
    } else {
      data.dms[dmIndex].messages[messageIndex].message = message;

      setData(data);
      messageN(message, getUId(token), true, data.dms[dmIndex].dmId);
    }
  }

  return {};
}

/**
  * Given a user token who is a member of channel with channelId,
  * and a message to be sent to the channel.
  * - If successful, return messageId of sent message.
  * - If any errors are encountered, throw error.
  *
  * @param {string} token - token of authorised user
  * @param {number} channelId - Id of channel
  * @param {string} message - message to be sent
  * @returns {number} - messageId on successful return
*/

function messageSendV2(token: string, channelId: number, message: string): { messageId: number } {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const channelIndex: number = data.channels.map(channel => channel.channelId).indexOf(channelId);
  if (channelIndex < 0) {
    throw HTTPError(400, 'invalid channelId');
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

  if (message.length < 1) {
    throw HTTPError(400, 'message string cannot be below 1 character');
  } else if (message.length > 1000) {
    throw HTTPError(400, 'message string cannot be over 1000 characters');
  }

  const messageId: number = generateMessageId();
  data.channels[channelIndex].messages.push({
    messageId: messageId,
    uId: authUserId,
    message: message,
    timeSent: Math.floor((new Date()).getTime() / 1000),
    pin: false,
  });
  setData(data);
  messageN(message, getUId(token), false, channelId);
  return { messageId: messageId };
}

const messageUnPinV1 = (token: string, messageId: number) => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!isMessageIdValid(token, messageId)) {
    throw HTTPError(400, 'invalid message id');
  } else if (!isPinned(messageId)) {
    throw HTTPError(400, 'the message is not already pinned');
  } else if (!isPermitted(token, messageId)) {
    throw HTTPError(403, 'valid message id but user does not have permissions');
  }

  const relevantMessage = getMessage(messageId);
  const key: string = relevantMessage.platform;
  const index: number = relevantMessage.platformIndex;
  const messageIndex: number = relevantMessage.messageIndex;

  const data: Data = getData();
  data[key][index].messages[messageIndex].pin = false;
  setData(data);

  return ({ });
};

export { messageSendDmV2, messageReactV1, messageEditV2, messageSendV2, messageRemoveV2, messageSendLaterV1, messageSendLaterDmV1, messageShareV1, messageUnPinV1, messagePinV1, messageUnreactV1 };
