const express=require('express')
const post=require('../controllers/postsRoute.js')
const multer = require('multer');
const postMiddleware=require('../middleware/postMiddleware.js')
const postModelSideEffectHandler=require('../middleware/postModelSideEffecthandler.js')
const commentMiddleware=require('../middleware/commentMiddleware.js')
const commentModelSideEffectHandler=require('../middleware/commentModelSideEffectHandler.js')
const userModelSideEffectHandler=require('../middleware/userModelSideEffectHandler.js');
const postController = require('../controllers/postsRoute.js');
const commentController=require('../controllers/commentsRoute.js');
const auth = require('../middleware/authentication.js');
const userMiddleware = require('../middleware/userMiddleware.js');
const communityMiddleware = require('../middleware/communityMiddleware.js');
const router=express.Router()
// get communty
// router.get('/replies',auth.verifyToken,communityMiddleware.getCommunity,userMiddleware.checkCommunityBlock,communityMiddleware.checkUserBlock)
// create comment
// if comment is a reply then find the orginal comment and handle error if found and add it to req object
// hande user side effect and handle post side effect eventually send comment
router.post('/',auth.verifyToken,postMiddleware.getPost,commentMiddleware.checkForOgComment,commentMiddleware.createComment,commentModelSideEffectHandler.addCommentToOgComment
,postModelSideEffectHandler.addComment,userModelSideEffectHandler.addComment,commentController.sendComment)

// edit comment 
router.patch('/',auth.verifyToken,commentMiddleware.checkAuth,commentMiddleware.updateComment,commentController.sendComment)
// like a comment
// score updated
router.patch('/likes',auth.verifyToken,postMiddleware.getPost,commentMiddleware.verifyComment,commentMiddleware.updateCommentLikes,userModelSideEffectHandler.addLikedComment,commentController.sendComment)
router.patch('/dislikes',auth.verifyToken,postMiddleware.getPost,commentMiddleware.verifyComment,commentMiddleware.updateCommentDislikes,commentController.sendComment)
// get comment and it's replies then delete users then remove the list from the post 
router.delete('/',auth.verifyToken,
commentMiddleware.checkAuth,
commentModelSideEffectHandler.removeCommentFromOgComment
// input comment doc
// output commentsList which is a list of the comment and it's replies docs
,commentMiddleware.getCommentAndReplies,
// input is commentsList
userModelSideEffectHandler.removeLikes,
// input is commentsList
userModelSideEffectHandler.removeComments,
// input is commentsList
postModelSideEffectHandler.removeComments,
// input is commentsList
commentMiddleware.deleteComments,
// input is comment
commentController.sendComment)
module.exports=router