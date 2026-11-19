const userController = require('../controllers/userRoute.js')
const authentication=require('../middleware/authentication.js')
const userModelSideEffect=require('../middleware/userModelSideEffectHandler.js')
const userMiddleware=require('../middleware/userMiddleware')
const postModelSideEffectHandler=require('../middleware/postModelSideEffecthandler.js')
const postMiddleware=require('../middleware/postMiddleware.js')
const commentMiddleware=require('../middleware/commentMiddleware.js')
const express = require('express')
const Notification=require('../controllers/notificationRoute.js')
const communityController = require('../controllers/communityRoute.js')
const communityMiddleware = require('../middleware/communityMiddleware.js')
const commentModelSideEffectHandler=require('../middleware/commentModelSideEffectHandler.js')
// [NEW] demo mode: a password sign-in to a made-up person becomes a private copy (see middleware/demoMode.js)
const demoMode=require('../middleware/demoMode.js')
const router=express.Router()
router.get('/notifications',authentication.verifyToken,Notification.getNotifications)
router.patch('/',authentication.verifyToken,userController.patchUser)
router.get('/',authentication.verifyToken,userController.sendUser)
router.get('/login',authentication.verifyUser,demoMode.passwordLogin,authentication.generateToken,userController.sendUser)
// [NEW] the same login with email and password in the JSON body (the new client uses this one)
// why: a password in a query string or header ends up in server and proxy logs more easily
router.post('/login',authentication.verifyUser,demoMode.passwordLogin,authentication.generateToken,userController.sendUser)
router.post('/signup',authentication.checkEmailExists,userMiddleware.createUser,authentication.generateToken,userController.sendUser)

router.patch('/profile-image',authentication.verifyToken,userMiddleware.updateProfileImage,userMiddleware.saveUserImage,userController.sendImage)

router.patch('/cover-image',authentication.verifyToken,userMiddleware.updateCoverImage,userMiddleware.saveUserImage,userController.sendImage)

router.patch('/followers',
authentication.verifyToken,
// input req.body.addedUser Id
userMiddleware.getUser,
// check if followes and delete
userMiddleware.checkIfFollowes
// input is added user
,userModelSideEffect.addFollow
// input is activity
// sends follow
,userController.sendFollow)
router.delete('/',authentication.verifyUser,
userMiddleware.destructUser,)
router.get('/:userId',userController.getUser)
router.delete('/',authentication.verifyToken,
communityMiddleware.verifyNoRole
,postMiddleware.getPosts
,commentMiddleware.getPostsListsCommnetsList,
userModelSideEffect.deleteFromFriends
,postMiddleware.deletePosts,
commentMiddleware.deleteComments,
userModelSideEffect.removeLikes
,userModelSideEffect.removeLikedPosts,
postModelSideEffectHandler.removePostsFromShares,
postModelSideEffectHandler.removePostsFromOgShares,
postModelSideEffectHandler.deleteFiles,
userController.deleteUser
)
// block/unblock a user
router.patch('/block',authentication.verifyToken,userMiddleware.getBlockedUser,userModelSideEffect.blockUser,userController.getUser)
// block/unblock a community
router.patch('/block/community',authentication.verifyToken,communityMiddleware.getCommunity,communityMiddleware.verifyNoRole,userModelSideEffect.blockCommunity,userController.getUser)

module.exports=router
