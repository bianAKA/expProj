import { Channels, dMessages, message, Data, Users, getData, User, react } from './dataStore';
import request from 'sync-request';
import crypto from 'crypto';
import { port, url } from './config.json';
import { jwt } from 'jsonwebtoken'; // eslint-disable-line
const jwt = require('jsonwebtoken'); // eslint-disable-line

interface Channel {
  channelId: number,
  name: string
}

export interface GetMessage {
  platform: string,
  info: any,
  platformIndex: number,
  messageIndex: number
}

const isChannelIdValid = (channelId: number): boolean => getData().channels.map(channel => channel.channelId).includes(channelId);

const getIndexOfChannelId = (channelId: number) => (getData().channels.map(channel => channel.channelId)).indexOf(channelId);

const isAuthUserMemberChannel = (token: string, channelId: number): boolean => getData().channels[getIndexOfChannelId(channelId)].allMembers.map(uId => uId.uId).includes(getUId(token));

/**
  * To see if the authorised user has the permission to pin the message or not
  * Return true if user has, otherwise return false
  *
  * channel permission: owners of that channel and global owner
  * dm permission: original creator
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - message id
  *
  * @returns {boolean}
*/
const isPermitted = (token: string, messageId: number): boolean => {
  const relevantMessage: GetMessage = getMessage(messageId);

  if (relevantMessage.platform === 'channels') {
    return relevantMessage.info.ownerMembers.map((member: User) => member.uId).includes(getUId(token)) || getData().permissions.includes(getUId(token)) || getUId(token) === 1;
  } else {
    return relevantMessage.info.creatorId === getUId(token);
  }
};

/**
  * To see if the message is already pinned or not
  * Return true: message is already pinned
  * otherwise return false
  *
  * @param {messageId} number - message id
  *
  * @returns {boolean}
*/
const isPinned = (messageId: number): boolean => {
  const relevantMessage: GetMessage = getMessage(messageId);
  return relevantMessage.info.messages[relevantMessage.messageIndex].pin;
};

/**
  * Return the message that is contained the messageId
  *
  * @param {number} messageId - messageId
  *
  * @returns {object} - assume we will find it after all the error checking
*/
const getMessage = (messageId: number): GetMessage => {
  const data: Data = getData();

  const inChannels = data.channels.filter(channel => channel.messages.map(message => message.messageId).includes(messageId));
  if (inChannels.length !== 0) {
    const messageInfo: GetMessage = {
      platform: 'channels',
      info: inChannels[0],
      platformIndex: data.channels.findIndex(c => c === inChannels[0]),
      messageIndex: inChannels[0].messages.findIndex(message => message.messageId === messageId),
    };

    return messageInfo;
  } else {
    const inDms = data.dms.filter(dm => dm.messages.map(message => message.messageId).includes(messageId));

    const messageInfo: GetMessage = {
      platform: 'dms',
      info: inDms[0],
      platformIndex: data.dms.findIndex(dm => dm === inDms[0]),
      messageIndex: inDms[0].messages.findIndex(message => message.messageId === messageId)
    };

    return messageInfo;
  }
};

/**
  * To see if the message is already reacted by the authuser or not
  * Return true: message is already reacted by the same user
  * otherwise return false
  *
  * @param {string} token - token of authorised user
  * @param {messageId} number - message id
  *
  * @returns {boolean}
*/
const isReacted = (token: string, messageId: number): boolean => {
  const messageGet: GetMessage = getMessage(messageId);
  const message = messageGet.info.messages[messageGet.messageIndex];

  if (message.hasOwnProperty('reactInfo')) {        // eslint-disable-line
    return message.reactInfo.filter((react: react) => react.authUId === getUId(token) && react.reacting === true).length !== 0;
  }

  return false;
};

/**
  * To see if the user is a member of dm
  *
  * @param {string} token - token of authorised user
  * @param {dMessages} dm - information of that dm
  *
  * @returns {boolean} - true if user is a member, otherwise return flase
*/
const memberOfDm = (token: string, dm: dMessages): boolean => dm.uIds.includes(decodeToken(token)) || dm.creatorId === decodeToken(token);

/**
  * Go to every channel/dm that the authUser is a part of, then see if
  * that message exists in those channel/dm or not. Return true if yes,
  * otherwise return false
  *
  * @param {string} token - token of authorised user
  * @param {number} messageId - Id of message
  *
  * @returns {boolean} - successful return
*/
const isMessageIdValid = (token: string, messageId: number): boolean => {
  const data: Data = getData();

  const channelList = data.channels.filter(channel => authChannel(channel, token)).map(channel => channel.messages.map(message => message.messageId));
  const dmList = data.dms.filter(dm => memberOfDm(token, dm) || dm.creatorId === getUId(token)).map(dm => dm.messages.map(message => message.messageId));

  return channelList.concat(dmList).reduce((arrA, arrB) => arrA.concat(arrB)).includes(messageId);
};

/**
  * To see if the authorised user is a member of the channel by using the token
  *
  * @param {Channels} channel    - information of a channel
  * @param {string} token  - token
  *
  * @returns {boolean} - returns true if the authorised user is a member of a channel, otherwise returns false
*/
const authChannel = (channel: Channels, token: string): boolean => channel.allMembers.map(member => member.uId).includes(getUId(token)) || channel.ownerMembers.map(member => member.uId).includes(getUId(token));

/**
  * Return an object within channel id and name
  *
  * @param {Channels} channel   - information of a channel
  *
  * @returns {Channel} - extraction is finished
*/
const extractIdName = (channel: Channels): Channel => {
  return {
    channelId: channel.channelId,
    name: channel.name
  };
};

/**
  * Find the index of the given user in the list of users
  * Assume that user exists
  *
  * @param {Data} data      - data that stores the user lists
  * @param {string} token   - token
  *
  * @returns {number} - found that user
*/
const getIndexOfUser = (data: Data, token: string) => data.users.indexOf(data.users.filter(user => user.token.includes(token))[0]);

/**
  * Update information in the data
  *
  * @param {string} token     - token
  * @param {Data} data        - data that stores user lists
  * @param {string} whatInfo  - information that user wants to change
  * @param {string} newInfo   - information that user wants to update
  *
  * @returns {data} - updated data successfully
*/
const updateInfo = (token: string, data: Data, whatInfo: string, newInfo: string) => {
  data.users[getIndexOfUser(data, token)][whatInfo] = newInfo;
  return data;
};

/**
  * Find if the information is already used by another user or not
  *
  * @param {Data} data        - data that stores user lists
  * @param {string} whatInfo  - information that user wants to change
  * @param {string} newInfo   - information that user wants to update
  * @param {string} userToken - token of user
  *
  * @returns {boolean} - return true if information is duplicated, otherwise false is returned
*/
const isDuplicate = (data: Data, whatInfo: string, info: string, userToken: string) => data.users.filter(user => (!user.token.includes(userToken) && user[whatInfo] === info)).length !== 0;

/**
  * Return a string that its length is larger than 1000
  *
  * @returns {string}
*/
const getThousand = (): string => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function getHashOf(plaintext: string) {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/**
  * Generate a random token which represents the given authUserId
  *
  * @param {number} authUserId   - user id of authorised user
  *
  * @returns {string} - make a token
*/
function generateToken(authUserId: number): string {
  const token = jwt.sign(authUserId, 'lastminuteboost');
  return token;
}

/**
  * Reveal the authorised user id behind the token
  *
  * @param {string} token   - token
  *
  * @returns {number} - decoded token
*/
function decodeToken(token: string): number {
  return getUId(token);
}

/**
  * Traverse through users array in data store with a handle string. If the handle string
  * is used by other user, then append 0 to the end of the string/increment the number by 1 then
  * do the traverse until handle string is unique.
  *
  * @param {string} string   - handle string
  *
  * @returns {string} - handle string is unique across all the users in the data store
*/
function recursive(string: string): string {
  const data: Data = getData();
  let uniqueString = true;
  let stringNew: string = string;

  for (const i in data.users) {
    if (stringNew === data.users[i].handleStr) {
      uniqueString = false;
    }
  }

  if (uniqueString) {
    return (stringNew);
  } else {
    const handleLength = stringNew.length - 1;
    if (!Number.isNaN(parseInt(stringNew[handleLength]))) {
      const lastnumber = parseInt(stringNew[handleLength]) + 1;
      const stringArr = stringNew.split('');
      stringArr[handleLength] = lastnumber.toString();
      stringNew = stringArr.join('');
    } else {
      stringNew = stringNew.concat('0');
    }
    return recursive(stringNew);
  }
}

/**
  * Return an object that contains user's uId, email, first name, last name, and handle string
  *
  * @param {Users} users   - information of a user
  *
  * @returns {User} - extraction is finished
*/
function extractUser(users: Users): User {
  return {
    uId: users.uId,
    email: users.email,
    nameFirst: users.nameFirst,
    nameLast: users.nameLast,
    handleStr: users.handleStr
  };
}

/**
  * See if the token is valid or not
  *
  * @param {string} token   - token
  *
  * @returns {number} - returns true if given token is in the data store, otherwise returns false
*/
const isTokenValid = (token: string) => {
  const data = getData();
  for (const user of data.users) {
    for (const t of user.token) {
      if (t === token) {
        return true;
      }
    }
  }

  return false;
};

/**
  * Generate a unique message id
  *
  * @returns {number} - unique message id is generated
*/
const generateMessageId = (): number => {
  const data: Data = getData();

  const messageIdsInChannels = data.channels.map((channel: Channels) => channel.messages.map(detail => detail.messageId));
  const messageIdsInDm = data.dms.map((dm: dMessages) => dm.messages.map((detail: message) => detail.messageId));

  const allMessageIds = messageIdsInChannels.concat(messageIdsInDm).reduce((arrA, arrB) => arrA.concat(arrB));

  return allMessageIds.length === 0 ? 1 : Math.max(...allMessageIds) + 1;
};

/**
  * Send a message in a dm then store the message and its id into the data store
  *
  * @param {Data} data        - data store
  * @param {string} message   - message
  * @param {number} messageId - id of message
  * @param {number} dmId      - id of dm
  *
  * @returns {Data} - sent the message
*/
const sendingDm = (data: Data, message: string, messageId: number, dmId: number, token: string): Data => {
  data.dms[getIndexOfDmId(dmId)].messages.push(
    {
      messageId: messageId,
      uId: getUId(token),
      message: message,
      timeSent: Math.floor(Date.now() / 1000),
      pin: false
    }
  );

  return data;
};

/**
  * See if the uId is valid or not
  *
  * @param {number} uId   - uId
  *
  * @returns {boolean} - returns true if given uId is in the data store, otherwise returns false
*/
const isUidValid = (uId: number): boolean => getData().users.map(user => user.uId).includes(uId);

/**
  * Return the uId of the authorised user
  *
  * @param {string} token  - token
  *
  * @returns {number} - found uID
*/
function getUId(token: string): number {
  const data = getData();

  for (const user in data.users) {
    for (const i in data.users[user].token) {
      if (token === data.users[user].token[i]) {
        return data.users[user].uId;
      }
    }
  }
}

/**
  * Dm exists or not
  *
  * @param {number} dmId  - dm id
  *
  * @returns {boolean} - return true if there is a dm in the data store, otherwise return false
*/
const isDmIdValid = (dmId: number): boolean => getData().dms.map(dm => dm.dmId).includes(dmId);

/**
  * Find the index of the dm in the data dm list
  *
  * @param {number} dmId      - id of dm
  *
  * @returns {number} - found the index of the dm in the data dm list
*/
const getIndexOfDmId = (dmId: number): number => (getData().dms.map(dm => dm.dmId)).indexOf(dmId);

/**
  * Use given token to see if the authorised user is a member of dm
  *
  * @param {string} token     - token
  * @param {number} dmId      - id of dm
  *
  * @returns {boolean} - returns true if the authorised user is not a member of the dm, otherwise returns false
*/
const isAuthUserMember = (token: string, dmId: number): boolean => getData().dms[getIndexOfDmId(dmId)].uIds.includes(getUId(token));

/**
  * Use given token to see if the authorised user is a creator pf dm
  *
  * @param {string} token     - token
  * @param {number} dmId      - id of dm
  *
  * @returns {boolean} - returns true if the authorised user is not a member of the dm, otherwise returns false
*/
const isAuthUserCreator = (token: string, dmId: number): boolean => getData().dms[getIndexOfDmId(dmId)].creatorId === getUId(token);

const SERVER_URL = `${url}:${port}`;

/**
  * Convert JSON into Java Script object
  *
  * @param {JOSN} res  - respond
  *
  * @returns {object}  - convertion is successed
*/
const bodyStrToObj = (res: any) => JSON.parse(res.getBody() as string);

type Method = 'GET' | 'POST' | 'DELETE' | 'PUT';

/**
  * Making a request then return the respond
  *
  * @param {string} route   - authorised user id
  * @param {object} data    - data to make request
  * @param {Method} method  - method for making a request
  * @param {string} token   - token that is stored in headers
  *
  * @returns {object} - request is successed
*/
const requestFunction = (route: string, data: any, token: string, method: Method) => {
  let jq: object = { json: data };

  if (method === 'GET' || method === 'DELETE') {
    jq = { qs: data };
  }

  jq['headers'] = { token: token };       // eslint-disable-line

  const res = request(
    method,
    SERVER_URL + route,
    jq
  );

  return res.statusCode !== 200 ? res.statusCode : bodyStrToObj(res);
};

/**
  * Get number of messages exists
  *
  * @returns {number} - number of messages
*/
function findNumMessageExist() {
  const data: Data = getData();

  const messageIdsInChannels = data.channels.map((channel: Channels) => channel.messages.map(detail => detail.messageId));
  const messageIdsInDm = data.dms.map((dm: dMessages) => dm.messages.map((detail: message) => detail.messageId));

  let numOfMessages = 0;
  if (messageIdsInDm.length === 0 && messageIdsInChannels.length === 0) {
    numOfMessages = 0;
  } else if (messageIdsInDm.length === 0) {
    const allMessageIds = messageIdsInChannels.reduce((arrA, arrB) => arrA.concat(arrB));
    numOfMessages = allMessageIds.length;
  } else if (messageIdsInChannels.length === 0) {
    const allMessageIds = messageIdsInDm.reduce((arrA, arrB) => arrA.concat(arrB));
    numOfMessages = allMessageIds.length;
  } else {
    const allMessageIds = messageIdsInChannels.concat(messageIdsInDm).reduce((arrA, arrB) => arrA.concat(arrB));
    numOfMessages = allMessageIds.length;
  }

  return numOfMessages;
}

function findUtilizationRate() {
  const data = getData();
  let count = 0;

  for (const user of data.users) {
    const authUserId = user.uId;

    const numChannelsJoined: number = data.channels.filter(channel => channel.allMembers.map(user => user.uId).includes(authUserId)).length;
    const numDmsJoined: number = data.dms.filter(dm => dm.members.map(user => user.uId).includes(authUserId)).length;

    if (numChannelsJoined > 0 || numDmsJoined > 0) {
      count++;
    }
  }

  return count / data.users.length;
}

function ResetCodeGenerator() {
  const length = 20;
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export {
  requestFunction,
  ResetCodeGenerator,
  findUtilizationRate,
  findNumMessageExist,
  generateToken,
  decodeToken,
  isTokenValid,
  getIndexOfUser,
  isUidValid,
  isDmIdValid,
  getIndexOfDmId,
  recursive,
  extractUser,
  updateInfo,
  isDuplicate,
  getThousand,
  isAuthUserMember,
  isAuthUserCreator,
  generateMessageId,
  sendingDm,
  getUId,
  extractIdName,
  authChannel,
  getMessage,
  isReacted,
  memberOfDm,
  isMessageIdValid,
  isPinned,
  getHashOf,
  isPermitted,
  isChannelIdValid,
  isAuthUserMemberChannel,
  getIndexOfChannelId
};
