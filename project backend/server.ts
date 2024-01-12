import express, { json, Request, Response } from 'express';
import { echo } from './echo';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import { authRegisterV3, authLogoutV2, authLoginV3, authPasswordResetRequestV1, authPasswordResetResetV1 } from './auth';
import { channelsCreateV3, channelsListV3, channelsListAllV3 } from './channels';
import { dmCreateV2, dmListV2, dmRemoveV2, dmMessagesV2, dmDetailsV2, dmLeaveV2 } from './dms';
import { clearV1, searchV1 } from './other';
import { channelInviteV3, channelMessagesV3, channelLeaveV2, channelDetailsV3, channelJoinV3, channelRemoveOwnerV2, channelAddOwnerV2 } from './channel';
import { messageSendV2, messageEditV2, messageRemoveV2, messageSendDmV2, messageSendLaterV1, messageSendLaterDmV1, messageShareV1, messagePinV1, messageUnPinV1, messageUnreactV1, messageReactV1 } from './message';
import { userProfileSetNameV2, usersAllV2, userProfileSetEmailV2, userProfileSetHandleV2, userProfileUploadPhotoV1, userStatsV1, usersStatsV1, userProfileV3 } from './user';
import { userRemoveV1, userPermissionChangeV1 } from './admin';
import { standupActiveV1, standupSendV1, standupStartV1 } from './standup';
import { notificationGetV1 } from './notification';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());

// for logging errors (print to terminal)
app.use(morgan('dev'));

app.use('/static', express.static('static'));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// Example get request
app.get('/echo', (req: Request, res: Response, next) => {
  try {
    const data = req.query.echo as string;
    return res.json(echo(data));
  } catch (err) {
    next(err);
  }
});
app.post('/auth/passwordreset/request/v1', (req, res, next) => {
  try {
    const { email } = req.body;
    return res.json(authPasswordResetRequestV1(email));
  } catch (err) {
    next(err);
  }
});
app.post('/auth/passwordreset/reset/v1', (req, res, next) => {
  try {
    const { newPassword, resetCode } = req.body;
    return res.json(authPasswordResetResetV1(resetCode, newPassword));
  } catch (err) {
    next(err);
  }
});

app.post('/auth/register/v3', (req, res, next) => {
  try {
    const { email, password, nameFirst, nameLast } = req.body;
    return res.json(authRegisterV3(email, password, nameFirst, nameLast));
  } catch (err) {
    next(err);
  }
});

app.post('/channels/create/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { name, isPublic } = req.body;
    return res.json(channelsCreateV3(token, name, isPublic));
  } catch (err) {
    next(err);
  }
});

app.get('/search/V1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const queryStr = req.query.queryStr as string;
    return res.json(searchV1(token, queryStr));
  } catch (err) {
    next(err);
  }
});

app.post('/message/share/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { ogMessageId, message, channelId, dmId } = req.body;
    return res.json(messageShareV1(token, ogMessageId, message, channelId, dmId));
  } catch (err) {
    next(err);
  }
});

app.post('/message/sendlaterdm/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { dmId, message, timeSent } = req.body;
    return res.json(messageSendLaterDmV1(token, dmId, message, timeSent));
  } catch (err) {
    next(err);
  }
});

app.post('/message/sendlater/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId, message, timeSent } = req.body;
    return res.json(messageSendLaterV1(token, channelId, message, timeSent));
  } catch (err) {
    next(err);
  }
});

app.get('/dm/messages/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const dmId = parseInt(req.query.dmId as string);
    const start = parseInt(req.query.start as string);
    return res.json(dmMessagesV2(token, dmId, start));
  } catch (err) {
    next(err);
  }
});

app.delete('/message/remove/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const messageId = parseInt(req.query.messageId as string);
    return res.json(messageRemoveV2(token, messageId));
  } catch (err) {
    next(err);
  }
});

app.put('/message/edit/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { messageId, message } = req.body;
    return res.json(messageEditV2(token, messageId, message));
  } catch (err) {
    next(err);
  }
});

app.post('/message/send/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId, message } = req.body;
    return res.json(messageSendV2(token, channelId, message));
  } catch (err) {
    next(err);
  }
});

app.post('/message/pin/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { messageId } = req.body;
    res.json(messagePinV1(token, parseInt(messageId)));
  } catch (err) {
    next(err);
  }
});

app.post('/message/unpin/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { messageId } = req.body;
    res.json(messageUnPinV1(token, parseInt(messageId)));
  } catch (err) {
    next(err);
  }
});

app.post('/standup/start/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId, length } = req.body;
    return res.json(standupStartV1(token, channelId, length));
  } catch (err) {
    next(err);
  }
});

app.get('/standup/active/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId } = req.query;
    return res.json(standupActiveV1(token, parseInt(channelId)));
  } catch (err) {
    next(err);
  }
});

app.post('/standup/send/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId, message } = req.body;
    return res.json(standupSendV1(token, parseInt(channelId), message));
  } catch (err) {
    next(err);
  }
});

app.post('/channel/invite/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId, uId } = req.body;
    return res.json(channelInviteV3(token, channelId, uId));
  } catch (err) {
    next(err);
  }
});

app.post('/channel/addowner/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    res.json(channelAddOwnerV2(token, parseInt(req.body.channelId as string), parseInt(req.body.uId as string)));
  } catch (err) {
    next(err);
  }
});

app.post('/channel/removeowner/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    res.json(channelRemoveOwnerV2(token, parseInt(req.body.channelId as string), parseInt(req.body.uId as string)));
  } catch (err) {
    next(err);
  }
});

app.post('/auth/logout/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    res.json(authLogoutV2(token));
  } catch (err) {
    next(err);
  }
});

app.get('/channel/details/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    res.json(channelDetailsV3(token, parseInt(req.query.channelId as string)));
  } catch (err) {
    next(err);
  }
});

app.post('/channel/join/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { channelId } = req.body;
    return res.json(channelJoinV3(token, parseInt(channelId)));
  } catch (err) {
    next(err);
  }
});

app.post('/message/unreact/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { messageId, reactId } = req.body;

    res.json(messageUnreactV1(token, parseInt(messageId), parseInt(reactId)));
  } catch (err) {
    next(err);
  }
});

app.post('/channel/leave/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    res.json(channelLeaveV2(token, parseInt(req.body.channelId as string)));
  } catch (err) {
    next(err);
  }
});

app.delete('/admin/user/remove/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(userRemoveV1(token, parseInt(req.query.uId as string)));
  } catch (err) {
    next(err);
  }
});

app.post('/admin/userpermission/change/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(userPermissionChangeV1(token, parseInt(req.body.uId as string), parseInt(req.body.permissionId as string)));
  } catch (err) {
    next(err);
  }
});

app.get('/channel/messages/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const channelId = parseInt(req.query.channelId as string);
    const start = parseInt(req.query.start as string);
    return res.json(channelMessagesV3(token, channelId, start));
  } catch (err) {
    next(err);
  }
});

app.post('/dm/create/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const uIds = req.body.uIds;
    return res.json(dmCreateV2(token, uIds));
  } catch (err) {
    next(err);
  }
});

app.get('/dm/list/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(dmListV2(token));
  } catch (err) {
    next(err);
  }
});

app.delete('/dm/remove/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { dmId } = req.query;
    return res.json(dmRemoveV2(token, parseInt(dmId)));
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login/v3', (req, res, next) => {
  try {
    const { email, password } = req.body;
    return res.json(authLoginV3(email, password));
  } catch (err) {
    next(err);
  }
});

app.get('/user/profile/v3', (req, res, next) => {
  try {
    const token = req.header('token');
    const { uId } = req.query;
    return res.json(userProfileV3(token, parseInt(uId)));
  } catch (err) {
    next(err);
  }
});

app.get('/users/all/v2', (req, res, next) => {
  try {
    const token = req.header('token');
    return res.json(usersAllV2(token));
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/setname/v2', (req, res, next) => {
  try {
    const token = req.header('token');
    const { nameFirst, nameLast } = req.body;
    return res.json(userProfileSetNameV2(token, nameFirst, nameLast));
  } catch (err) {
    next(err);
  }
});

app.get('/dm/details/v2', (req, res, next) => {
  try {
    const token = req.header('token');
    const { dmId } = req.query;
    return res.json(dmDetailsV2(token, parseInt(dmId)));
  } catch (err) {
    next(err);
  }
});

app.post('/dm/leave/v2', (req, res, next) => {
  try {
    const token = req.header('token');
    const { dmId } = req.body;
    return res.json(dmLeaveV2(token, parseInt(dmId)));
  } catch (err) {
    next(err);
  }
});

app.get('/channels/list/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(channelsListV3(token));
  } catch (err) {
    next(err);
  }
});

app.get('/channels/listall/v3', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(channelsListAllV3(token));
  } catch (err) {
    next(err);
  }
});

app.post('/message/senddm/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { dmId, message } = req.body;
    return res.json(messageSendDmV2(token, parseInt(dmId), message));
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/setemail/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { email } = req.body;
    return res.json(userProfileSetEmailV2(token, email));
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/sethandle/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { handleStr } = req.body;
    return res.json(userProfileSetHandleV2(token, handleStr));
  } catch (err) {
    next(err);
  }
});

app.get('/notifications/get/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(notificationGetV1(token));
  } catch (err) {
    next(err);
  }
});
app.get('/user/stats/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(userStatsV1(token));
  } catch (err) {
    next(err);
  }
});
app.get('/users/stats/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    return res.json(usersStatsV1(token));
  } catch (err) {
    next(err);
  }
});

app.post('/message/react/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { messageId, reactId } = req.body;
    return res.json(messageReactV1(token, parseInt(messageId), parseInt(reactId)));
  } catch (err) {
    next(err);
  }
});

app.post('/user/profile/uploadphoto/v1', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const { imgUrl, xStart, yStart, xEnd, yEnd } = req.body;
    return res.json(userProfileUploadPhotoV1(token, imgUrl, parseInt(xStart), parseInt(yStart), parseInt(xEnd), parseInt(yEnd)));
  } catch (err) {
    next(err);
  }
});

app.delete('/clear/v1', (req, res) => {
  res.json(clearV1());
});

// handles errors nicely
app.use(errorHandler());

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server listening on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});

const secret = 'PleaseGiveUsMarks';
export { secret };
