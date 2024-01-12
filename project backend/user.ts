import { getData, setData, Data } from './dataStore';
import fs from 'fs';
import { updateInfo, isDuplicate, isTokenValid, getUId, findNumMessageExist, findUtilizationRate, decodeToken } from './helper';
import validator from 'validator';
import request from 'sync-request';
import HTTPError from 'http-errors';

/**
  * Update the email of a user
  *
  * @param {string} token       - token of the user
  * @param {string} email       - new email of the user
  *
  * @returns {object}           - token is invalid
  * @returns {object}           - email is invalid
  * @returns {object}           - email is used by other
  * @returns {      }           - updated email successfully
  *
*/
const userProfileSetEmailV2 = (token: string, email: string): Record<string, never> => {
  const data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!validator.isEmail(email)) {
    throw HTTPError(400, 'invalid email');
  } else if (isDuplicate(data, 'email', email, token)) {
    throw HTTPError(400, 'email is already being used by another user');
  }

  setData(updateInfo(token, data, 'email', email));
  return ({ });
};

/**
  * Update the email of a user
  *
  * @param {string} token       - token of the user
  * @param {string} handleStr   - new handle string of the user
  *
  * @returns {object}           - token is invalid
  * @returns {object}           - handle string is invalid
  * @returns {object}           - handle string is used by other
  * @returns {      }           - updated handle string successfully
  *
*/
// '/^[a-z0-9]+$/gi.test' is from <https://www.30secondsofcode.org/js/s/is-alpha-numeric>
// it checks if a string contains only alphanumeric characters.
const userProfileSetHandleV2 = (token: string, handleStr: string): Record<string, never> => {
  const data: Data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (handleStr.length < 3 || handleStr.length > 20) {
    throw HTTPError(400, 'length of handleStr is not between 3 and 20 characters inclusive');
  } else if (isDuplicate(data, 'handleStr', handleStr, token)) {
    throw HTTPError(400, 'the handleStr is already used by another user');
  } else if (!(/^[a-z0-9]+$/gi.test(handleStr))) {
    throw HTTPError(400, 'handleStr contains non-alphanumeric characters');
  }

  setData(updateInfo(token, data, 'handleStr', handleStr));
  return ({ });
};

/**
 * Crop the image, then save the cropped image into a specific path
 *
 * @param {any} body - body of image
 * @param {number} uId - user Id
 * @param {number} xStart - start x-coordinate of new image
 * @param {number} yStart - start y-coordinate of new image
 * @param {number} xEnd - end x-coordinate of new image
 * @param {number} yEnd - end y-coordinate of new image
 */
async function cropImage(body: any, uId: number, xStart: number, xEnd: number, yStart: number, yEnd: number) {
  const sharp = require('sharp');
  const imagePath = `./static/${uId}.jpg`;
  await sharp(body)
    .extract({ width: xEnd - xStart, height: yEnd - yStart, left: xStart, top: yStart })
    .toFile(imagePath);
}

/**
 * Crop the given image then upload the new image url into user's profile
 *
 * @param {string} token - user token
 * @param {string} imgUrl - url of image
 * @param {number} xStart - start x-coordinate of new image
 * @param {number} yStart - start y-coordinate of new image
 * @param {number} xEnd - end x-coordinate of new image
 * @param {number} yEnd - end y-coordinate of new image
 *
 * @return {object} successfully cropped and uploeaded it
 */
const userProfileUploadPhotoV1 = (token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number) => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  } else if (!/\.(jpg)$/.test(imgUrl)) {
    throw HTTPError(400, 'image uploaded is not a JPG');
  } else if (xEnd <= xStart || yEnd <= yStart) {
    throw HTTPError(400, 'xEnd is less than or equal to xStart or yEnd is less than or equal to yStart');
  }

  try {
    const res = request('GET', imgUrl);       // eslint-disable-line
  } catch (err) {
    throw HTTPError(400, 'cannot retrive the image');
  }

  const body: Buffer = res.getBody();       // eslint-disable-line
  const dimension = require('image-size');
  const photo = dimension(body);

  if (xEnd > photo.width || yEnd > photo.height || xStart < 0 || yStart < 0) {
    throw HTTPError(400, 'some/all values are not within the dimensions of the image');
  }

  const uId: number = getUId(token);
  const imagePath = `./static/${uId}.jpg`;

  const folderName: string = !fs.existsSync('./static') ? fs.mkdirSync('./static') : './static';        // eslint-disable-line

  fs.writeFileSync(imagePath, body);
  cropImage(body, uId, xStart, xEnd, yStart, yEnd);

  const data = getData();
  for (const user of data.users) {
    if (user.uId === uId) {
      user.profileImgUrl = imagePath;
    }
  }

  for (const channel of data.channels) {
    for (const member of channel.allMembers) {
      if (member.uId === uId) {
        member.profileImgUrl = imagePath;
      }
    }
  }

  for (const dm of data.dms) {
    for (const dM of dm.uIds) {
      if (dM === uId) {
        dM.profileImgUrl = imagePath;
      }
    }
  }

  setData(data);
  return {};
};
/**
  * Outputs details of inputted user of uId
  *
  * @param {string} token       - token of the user
  * @param {string} uId         - number of uId
  *
  * @returns {string}           - Error
  * @returns {      }           - Outputted successfully
  *
*/

function userProfileV3(token: string, uId: number) {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }
  const data = getData();
  let uIdvalid = false;
  let index = 0;

  for (let i = 0; i < data.users.length; i++) {
    if (uId === data.users[i].uId) {
      uIdvalid = true;
      index = i;
    }
  }
  if (uIdvalid === false) {
    throw HTTPError(400, 'invalid uId');
  }
  let isRemovedUser = false;
  if (data.removedUsers.length > 0) {
    let i = 0;
    for (i; i < data.removedUsers.length; i++) {
      if (uId === data.removedUsers[i].uId) {
        index = i;
        isRemovedUser = true;
        break;
      }
    }
  }
  if (isRemovedUser) {
    const user = {
      uId: data.removedUsers[index].uId,
      email: data.removedUsers[index].email,
      nameFirst: data.removedUsers[index].nameFirst,
      nameLast: data.removedUsers[index].nameLast,
      handleStr: data.removedUsers[index].handleStr
    };
    return { user: user };
  }

  const user = {
    uId: data.users[index].uId,
    email: data.users[index].email,
    nameFirst: data.users[index].nameFirst,
    nameLast: data.users[index].nameLast,
    handleStr: data.users[index].handleStr
  };
  return { user: user };
}

/**
  * Gives details of allUsers
  *
  * @param {string} token       - token of the user
  *
  * @returns {object}           - No error
  *
*/
function usersAllV2(token: string) {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const usersall = [];
  for (const user of data.users) {
    usersall.push(
      {
        uId: user.uId,
        email: user.email,
        nameFirst: user.nameFirst,
        nameLast: user.nameLast,
        handleStr: user.handleStr,
      }
    );
  }
  return { users: usersall };
}

/**
  * Gives details of allUsers
  *
  * @param {string} token       - token of the user
  * @param {string} nameFirst       - first name of user
  * @param {string} nameLast       - last name of user
  *
  * @returns {object}           - No error
  *
*/
function userProfileSetNameV2(token: string, nameFirst: string, nameLast: string) {
  const data = getData();

  if (nameFirst.length > 50 || nameFirst.length < 1) {
    throw HTTPError(400, 'invalid first name');
  } else if (nameLast.length > 50 || nameLast.length < 1) {
    throw HTTPError(400, 'invalid last name');
  } else if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  let i = 0;
  let j = 0;
  for (i; i < data.users.length; i++) {
    if (data.users[i].token.includes(token)) break;
  }
  for (j; j < data.users[i].token.length; j++) {
    if (data.users[i].token[j] === token) {
      data.users[i].nameFirst = nameFirst;
      data.users[i].nameLast = nameLast;
    }
  }

  setData(data);
  return {};
}

function userStatsV1(token: string) {
  const data = getData();

  const authUserId: number = decodeToken(token);
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Token is invalid');
  }

  const numChannelsJoined: number = data.channels.filter(channel => channel.allMembers.map(user => user.uId).includes(authUserId)).length;
  const numDmsJoined: number = data.dms.filter(dm => dm.members.map(user => user.uId).includes(authUserId)).length;

  const numMessagesSentChannel: number = data.channels.filter(channel => channel.messages.map(message => message.uId).includes(authUserId)).length;
  const numMessagesSentDm: number = data.dms.filter(dm => dm.messages.map(message => message.uId).includes(authUserId)).length;
  const numMessagesSent: number = numMessagesSentChannel + numMessagesSentDm;

  const numerator: number = numChannelsJoined + numDmsJoined + numMessagesSent;
  let denominator: number = data.channels.length + data.dms.length + findNumMessageExist();
  if (denominator === 0) {
    denominator = 1;
  }
  let involvementRate: number = numerator / denominator;
  if (involvementRate > 1) {
    involvementRate = 1;
  }

  const userStats = {
    channelsJoined: [{ numChannelsJoined: numChannelsJoined, timeStamp: Math.floor(Date.now() / 1000) }],
    dmsJoined: [{ numDmsJoined: numDmsJoined, timeStamp: Math.floor(Date.now() / 1000) }],
    messagesSent: [{ numMessagesSent: numMessagesSent, timeStamp: Math.floor(Date.now() / 1000) }],
    involvementRate: involvementRate,
  };

  return { userStats };
}

export function usersStatsV1 (token: string) {
  const data = getData();

  if (!isTokenValid(token)) {
    throw HTTPError(403, 'Invalid Token');
  }

  const timeStamped = Math.floor(Date.now() / 1000);

  const channelExist = [{
    numChannelsExist: data.channels.length,
    timeStamp: timeStamped
  }];

  const dmExist = [{
    numDmsExist: data.dms.length,
    timeStamp: timeStamped
  }];

  const messageExist = [{
    numMessagesExist: findNumMessageExist(),
    timeStamp: timeStamped
  }];

  const workspaceStats = {
    channelsExist: channelExist,
    dmsExist: dmExist,
    messagesExist: messageExist,
    utilizationRate: findUtilizationRate()
  };

  return { workspaceStats };
}

export {
  userProfileSetEmailV2,
  userProfileSetHandleV2,
  userProfileV3,
  usersAllV2,
  userProfileSetNameV2,
  userProfileUploadPhotoV1,
  userStatsV1
};
