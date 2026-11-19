// [NEW] file: direct messages over HTTP (the socket events are in controllers/messageRoute.js)
const express=require('express')
const auth=require('../middleware/authentication.js')
const messageController=require('../controllers/messageRoute.js')
const router=express.Router()
// all conversations of the signed in user
router.get('/conversations',auth.verifyToken,messageController.conversations)
// number of unread messages
router.get('/unread',auth.verifyToken,messageController.unread)
// the messages with one person (also marks them as read)
router.get('/:userId',auth.verifyToken,messageController.thread)
// send a message {to,text}
router.post('/',auth.verifyToken,messageController.send)
module.exports=router
