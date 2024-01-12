import { isTokenValid, getUId, getIndexOfDmId, GetMessage } from './helper';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { getData } from './dataStore';
import HTTPError from 'http-errors';

const notificationPath = './notification.json';

interface information {
  channelId: number,
  dmId: number,
  notificationMessage: string
}

interface telling {
  toUId: number,
  messages: information[]
}

interface Notification {
  info: telling[]
}

/**
  * Get the notifications of a user
  *
  * @returns {Notification} - if there is notification
  * @returns {{ info: [] } } - if there is no notification
*/
const getNotification = (): Notification | { info: [] } => existsSync(notificationPath) ? JSON.parse(readFileSync(notificationPath).toString()) : { info: [] };

/**
  * Update notification
  *
  * @param {Notification} noitification - new notification
*/
const setNotification = (notification: Notification) => {
  writeFileSync(notificationPath, JSON.stringify(notification));
};

/**
  * Get handle string of that user
  *
  * @param {number} uId - id of user
  *
  * @return {string} - found the user's handle string
*/
const getHandleStr = (uId: number): string => getData().users.filter(user => user.uId === uId)[0].handleStr;

/**
  * Find the index of the channel in the data channels list
  *
  * @param {number} channelId      - id of dm
  *
  * @returns {number} - found the index of the channel in the data channels list
*/
const getIndexOfChannelId = (channelId: number): number => (getData().channels.map(channel => channel.channelId)).indexOf(channelId);

/**
  * Generate a string for addd
  *
  * @param {number} from - UId of the person who got this
  * @param {number} platformId - id of dm/channel
  * @param {boolean} isDm - true if the platform is dm, otherwise is in channel
  *
  * @return {string} - generated
*/
const generateAdd = (from: number, platformId: number, isDm: boolean): string => {
  let platformName = '';

  if (isDm) {
    for (const dm of getData().dms) {
      if (dm.dmId === platformId) {
        platformName = dm.name;
        break;
      }
    }
  } else {
    for (const channel of getData().channels) {
      if (channel.channelId === platformId) {
        platformName = channel.name;
      }
    }
  }

  return `${getHandleStr(from)} added you to ${platformName}`;
};

/**
  * Generate a string for tagged
  *
  * @param {number} from - UId of the person who got this
  * @param {number} platformId - id of dm/channel
  * @param {boolean} isDm - true if the platform is dm, otherwise is in channel
  * @param {string} message - message
  *
  * @return {string} - generated
*/
const generateTagged = (from: number, platformId: number, isDm: boolean, message: string): string => {
  let platformName = '';

  if (isDm) {
    for (const dm of getData().dms) {
      if (dm.dmId === platformId) {
        platformName = dm.name;
        break;
      }
    }
  } else {
    for (const channel of getData().channels) {
      if (channel.channelId === platformId) {
        platformName = channel.name;
      }
    }
  }

  const userHandleStr: string = getHandleStr(from);
  return `${userHandleStr} tagged you in ${platformName}: ${message.slice(0, 20)}`;
};

/**
  * Generate a string for reacting
  *
  * @param {number} from - UId of the person who got this
  * @param {object} detail - details of that message
  *
  * @return {string} - generated
*/
const generateReacted = (from: number, detail: GetMessage): string => `${getHandleStr(from)} reacted to your message in ${detail.info.name}`;

/**
 * Retrun true, if this user is tagged, otherwise return false
 *
 * @param {string} message - message of the string
 * @param {string} tag - tag format
 *
 * @return {boolean} - true if the user is tagged, otherwise return false
 */
const isTag = (message: string, tag: string) => {
  if (message.endsWith(tag)) {
    return true;
  }

  let i = 0;
  while (i < message.length) {
    if (message[i] === tag[0]) {
      let j: number = i;
      let x = 0;
      let numMatch = 0;
      while (x < tag.length) {
        if (message[j++] === tag[x++]) {
          numMatch++;
        }
      }

      if (numMatch === tag.length && !/^[a-z0-9]+$/gi.test(message[j])) {
        return true;
      }
    }

    i++;
  }

  return false;
};

/**
 * Get uId by using the given handle string
 *
 * @param {string} handleStr - handle string
 *
 * @return {number} - uId
 */
const handleStrToUId = (handleStr: string) => getData().users.filter(user => user.handleStr === handleStr)[0].uId;

/**
  * If the user who holds the given uId is the member of channel/dm, then return true
  *
  * @param {number} uId - id of user
  * @param {boolean} isDm - true if the platform is dm, otherwise is in channel
  * @param {number} platformId - id of dm/channel
  *
  * @returns {number} - found the index of the channel in the data channels list
*/
const validTag = (uId: number, isDm: boolean, platformId: number): boolean => {
  if (isDm) {
    const indexDm: number = getIndexOfDmId(platformId);
    return getData().dms[indexDm].uIds.includes(uId);
  } else {
    const indexChannel: number = getIndexOfChannelId(platformId);
    return getData().channels[indexChannel].allMembers.map(member => member.uId).includes(uId);
  }
};

/**
  * Add @ before each handle string, then collect those and return them as a string array
  *
  * @return {string[]} - tagged handle string array
*/
const getAllTagHandleStr = () => getData().users.map(user => '@' + user.handleStr);

/**
  * To see if this person got notice or not
  *
  * @param {number} to -  uId of that uer
  *
  * @return {boolean} - true if that user got it, otherwise false
*/
const gotNotice = (uId: number): boolean => getNotification().info.map(telling => telling.toUId).includes(uId);

/**
 * If the user haven't got noticed before, when we need to make a new object for tht user
 *
 * @param {Notification} notification - notification store
 * @param {number} channel - if is -1 then it happened in dm, otherwise is the channelId
 * @param {number} dm - if is -1 then it happened in channel, otherwise is the dmID
 * @param {string} text - message
 * @param {number} to - UId of the person who got this
 */
const pushInfo = (notification: Notification, channel: number, dm: number, text: string, to: number): Notification => {
  notification.info.push({
    toUId: to,
    messages: [{
      channelId: channel,
      dmId: dm,
      notificationMessage: text
    }]
  });

  return notification;
};

/**
 * If the user got noticed before, so just need to push the new message
 *
 * @param {Notification} notification - notification store
 * @param {number} channel - if is -1 then it happened in dm, otherwise is the channelId
 * @param {number} dm - if is -1 then it happened in channel, otherwise is the dmID
 * @param {string} text - message
 * @param {number} to - UId of the person who got this
 */
const pushMessage = (notification: Notification, channel: number, dm: number, text: string, to: number): Notification => {
  for (const telling of notification.info) {
    if (telling.toUId === to) {
      telling.messages.push({
        channelId: channel,
        dmId: dm,
        notificationMessage: text
      });

      break;
    }
  }

  return notification;
};

/**
 * Make notification for tadd member to a dm/channel
 *
 * @param {number} from - UId of the person who got this
 * @param {number} platformId - id of dm/channel
 * @param {boolean} isDm - true if the platform is dm, otherwise is in channel
 * @param {number | number[]} toUids: - array of uIds or uId that is invited to be a member of channel/dm
 *
 */
const createN = (from: number, platformId: number, isDm: boolean, toUIds: number | number[]) => {
  const toUId: number[] = typeof toUIds === 'number' ? [toUIds] : [...toUIds];

  const addMessage: string = generateAdd(from, platformId, isDm);
  for (const to of toUId) {
    let notification: Notification = getNotification();

    let dm = -1;
    let channel = -1;
    if (isDm) {
      dm = platformId;
    } else {
      channel = platformId;
    }

    if (notification.info.length === 0 || !gotNotice(to)) {
      notification = pushInfo(notification, channel, dm, addMessage, to);
    } else {
      notification = pushMessage(notification, channel, dm, addMessage, to);
    }

    setNotification(notification);
  }
};

/**
  * Make notification for tagged
  *
  * @param {string} message: message
  * @param {number} sender: user who send the message
  * @param {boolean} isDm - true if the platform is dm, otherwise is in channel
  * @param {number} platformId - id of dm/channel
*/
const messageN = (message: string, sender: number, isDm: boolean, platformId: number) => {
  const toHandleStr: string[] = getAllTagHandleStr();

  // inside toHandleStr, the handle string are all valid. Hence, the handle
  // string which is tagged must be valid as well.
  const gotTagged: string[] = toHandleStr.filter(tag => isTag(message, tag));
  const toHandleString: string[] = gotTagged.map(text => text.substring(1));
  const toUIds: number[] = toHandleString.map(handleStrToUId);

  // remove duplicate tags
  const uIds: number[] = toUIds.filter((item, index) => toUIds.indexOf(item) === index);

  // check in that channel/dm, handler owner exiest or not
  const toUId: number[] = uIds.filter(uId => validTag(uId, isDm, platformId));

  const taggedMessage: string = generateTagged(sender, platformId, isDm, message);
  for (const to of toUId) {
    let notification: Notification = getNotification();

    let dm = -1;
    let channel = -1;
    if (isDm) {
      dm = platformId;
    } else {
      channel = platformId;
    }

    if (notification.info.length === 0 || !gotNotice(to)) {
      notification = pushInfo(notification, channel, dm, taggedMessage, to);
    } else {
      notification = pushMessage(notification, channel, dm, taggedMessage, to);
    }

    setNotification(notification);
  }
};

/**
  * Make notification for reacting messages
  *
  * @param {number} channel - if is -1 then it happened in dm, otherwise is the channelId
  * @param {number} dm - if is -1 then it happened in channel, otherwise is the dmID
  * @param {number} from - UId of the person who did it
  * @param {number} to - UId of the person who got this
  * @param {object} detail - details of that message
*/
const reactN = (channel: number, dm: number, from: number, to: number, detail: GetMessage) => {
  let notification: Notification = getNotification();
  const notificationStr = generateReacted(from, detail);

  if (notification.info.length === 0 || !gotNotice(to)) {
    notification = pushInfo(notification, channel, dm, notificationStr, to);
  } else {
    notification = pushMessage(notification, channel, dm, notificationStr, to);
  }

  setNotification(notification);
};

/**
  * Returns the user's most recent 20 notifications, ordered from most recent to least recent.
  *
  * @param {string} token  - token
  *
  * @returns {object[]} - token is valid
*/
const notificationGetV1 = (token: string): { notifications: information[] } => {
  if (!isTokenValid(token)) {
    throw HTTPError(403, 'invalid token');
  }

  const notification: telling[] = getNotification().info;
  const messages: information[] = notification.filter(message => message.toUId === getUId(token))[0].messages.reverse().slice(0, 20);
  return { notifications: messages };
};

export {
  notificationGetV1,
  setNotification,
  createN,
  messageN,
  reactN
};
