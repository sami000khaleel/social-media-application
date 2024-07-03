const express=require('express')
const multer = require('multer');
const auth = require('../middleware/authentication.js');
const postMiddleware=require('../middleware/postMiddleware.js')
const postModelSideEffectHandler=require('../middleware/postModelSideEffecthandler.js')
const commentMiddleware=require('../middleware/commentMiddleware.js')
const userModelSideEffectHandler=require('../middleware/userModelSideEffectHandler.js');
const postController = require('../controllers/postsRoute.js');
const commentModelSideEffectHandler = require('../middleware/commentModelSideEffectHandler.js');
const communityMiddleware = require('../middleware/communityMiddleware.js');
const router=express.Router()
// get post
router.get('/',postController.getPost)
//get user posts
router.get('/get-user-posts/:userId',postController.sendUserPosts)
// when a post is created 
// verify token
//check if its shared or not 
// create post and handle side effect on user (add post to user posts)
// 
//if shared handle side effect on original post(add poster id to shares list on original post) and user side effect
// eventually return the post
router.post('/',auth.verifyToken,communityMiddleware.getCommunity,postMiddleware.validateShare,
postMiddleware.createPost,
//check if post was shared then add publisher id to og post shares
postModelSideEffectHandler.addPosterIdToOriginalPostShares,
userModelSideEffectHandler.addPostToPublisherPosts,
communityMiddleware.addPost,postMiddleware.classifyPost,
postMiddleware.updateSeq,postController.sendPost)

// update post 
// find post and check client is the author
// update post
// send post
router.patch('/',auth.verifyToken,postMiddleware.verifyPostAuthor,
postMiddleware.updatePostDescribtion,postController.sendPost)
// like a post 
// update likes 
// handle user likes update side effect
router.patch('/like',auth.verifyToken,postMiddleware.getPost,postMiddleware.getPostPublisher,postMiddleware.updateLikes,userModelSideEffectHandler.updateLikes,postController.sendPost)
router.patch('/dislike',auth.verifyToken,postMiddleware.getPost,postMiddleware.getPostPublisher,postMiddleware.updateDisikes,postController.sendPost)

// delet posts
// get the post
// remove the post
// get comments as comments list
// delete comments
// remove comments from users
// remove liked comments from user 
// notify shared posts
router.delete('/',auth.verifyToken,
// input is postId output is the verified post 
postMiddleware.verifyPostAuthor,
postMiddleware.getPostsList,
communityMiddleware.removePostsList,
// input is post output is commentList
postMiddleware.getComments,
// input is post output is commentsList
commentMiddleware.deleteComments,
userModelSideEffectHandler.removeLikes,
userModelSideEffectHandler.removeComments,
userModelSideEffectHandler.removePosts,
userModelSideEffectHandler.removeLikedPosts,
postModelSideEffectHandler.removePostsFromOgShares,
postModelSideEffectHandler.removePostsFromShares,
postModelSideEffectHandler.deleteFiles,
postMiddleware.deletePosts,
postController.sendPost)


// get posts comments
router.get('/comments',auth.verifyToken,postController.getPostComments)









router.get('/likes',auth.verifyToken,postController.getReactions)
// router.delete('/',auth.verifyToken,post.deletePost )
// //react to a post like or share
// router.post('/comments',auth.verifyToken,post.createComment)
// router.patch('/',auth.verifyToken,post.postReaction)
// router.patch('/comments',auth.verifyToken,post.commentReaction)
// router.delete('/comments',auth.verifyToken,post.deleteComment)
// router.get('/shares',auth.verifyToken,post.getShares)
// for files
module.exports=router