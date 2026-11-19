const Comment=require('../models/commentSchema.js')
// [AI OFF] only used to ask the Python AI server if a comment is bad (see createComment)
// const axios = require('axios');
const Notification=require('../models/notificationSchema.js')
const User=require('../models/userSchema.js')
const interestsMiddleWare = require('./interestsMiddleware.js')

class commentsMiddleware{
    constructor(){

    }
    static async getPostsListsCommnetsList(req,res,next){
        try
        {
            let {postsList}=req
            let commentsList=[]
            for (let i = 0; i < postsList.length; i++) 
                for (let j = 0; j < postsList[i].comments.length; j++) 
                {
                    let comment=await Comment.findById(postsList[i].comments[j])
                    commentsList.push(comment)

                }
                req.commentsList=commentsList
                return next()
                
        }
            catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getPostCommentsList(req,res,next){
        try
        {
        let commentsList=[... req.post.comments]
        req.commentsList=commentsList
        return next()        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getCommentAndReplies(req,res,next){
        try
        {
            const {comment}=req
            let commentsList=[]
            async function getReplies(replies){
               let tempList=[]
                for (let i = 0; i < replies.length; i++) {
                    let reply=await Comment.findById(replies[i])
                    tempList.push(reply)
                }
              commentsList=  commentsList.concat(tempList)
                for (let i = 0; i < tempList.length; i++) {
                    await  getReplies(tempList[i].repliedBy)
                }
                
            }
            if(comment.repliedBy.length)
            await getReplies(comment.repliedBy)
            commentsList.push(comment)
            console.log(commentsList.length)
            req.commentsList=commentsList
            return next()
        }

        catch(err){

            return res.json({success:false,err:err.message})
        }}
        static async deleteComments(req,res,next){
            try
            {
            let comments=req.commentsList
            // [FIX] forEach(async ...) did not wait, so the answer came before the comments were deleted
            // comments.forEach(async(comment)=>await comment.delete())
            for (const comment of comments)
                await comment.deleteOne()
            return next()    
            }
            catch(err){
                return res.json({success:false,err:err.message})
            }
        }
    static async updateComment(req,res,next){
        try
        {
            let {comment} =req
            comment.content=req.body.content
           await comment.save()
           req.comment=comment
            // [CHANGED] no notification to yourself for editing your own comment
            // const notification=await Notification.create({user:req.user.id,subject:{model:'Comment',action:'updateComment',id:comment.id}})
            return next()

        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async checkAuth(req,res,next){
        try
        {
        
        let comment =await Comment.findById(req.body.commentId||req.query.commentId)
        if(!comment)
        return res.json({success:false,err:'no comment was found'})
        if(comment.user.toString()!==req.user.id)
        return res.json({success:false,err:'you are not the owner of this comment'})
        req.comment=comment
        return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
static async updateCommentDislikes(req,res,next){
    try
    {
    let {comment,user,post}=req
    // if user liked then remove
    comment.likedBy= comment.likedBy.filter(id=>id.toString()!==req.user.id)
    // check if user liked
    if(comment.dislikedBy.some(userId=>userId.toString()===user.id))
    {   // remove dislike
        await interestsMiddleWare.updateScore(post.category,comment.positivity?'undislikePositiveComment':'undislikeNegativeComment',user)
        req.dislike=false
        comment.dislikedBy=comment.dislikedBy.filter(userId=>userId.toString()!==user.id)
    await comment.save()
        // [CHANGED] no "dislikeComment" notification when a dislike is taken back
        // await Notification.create({user:comment.user,subject:{model:'Comment',action:'dislikeComment',id:comment.id},notifier:req.user.id})
        return next()
}
    // otherwise like
    await interestsMiddleWare.updateScore(post.category,comment.positivity?'dislikePositiveComment':'dislikeNegativeComment',user)

    req.dislike=true
    comment.dislikedBy.push(user.id)
    await comment.save()
    req.comment=comment
    return next()
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
}
static async updateCommentLikes(req,res,next){
    try
    {
    let {comment,user,post}=req
    // check if disliked
    comment.dislikedBy= comment.dislikedBy.filter(id=>id.toString()!==req.user.id)

    // check if user disliked
    if(comment.likedBy.some(userId=>userId.toString()===user.id))
    {   // remove like
        // [FIX] uses the unlike score (it used the undislike one)
        await interestsMiddleWare.updateScore(post.category,comment.positivity?'unlikePositiveComment':'unlikeNegativeComment',user)
        req.like=false
        comment.likedBy=comment.likedBy.filter(userId=>userId.toString()!==user.id)
    await comment.save()
        // [FIX] the "liked your comment" notification was sent here, when the like was REMOVED (moved below)
        // await Notification.create({user:comment.user,subject:{model:'Comment',action:'likeComment',id:comment.id},notifier:req.user.id})
        return next()
}
    // otherwise like
    await interestsMiddleWare.updateScore(post.category,comment.positivity?'likePositiveComment':'likeNegativeComment',user)

    req.like=true
    comment.likedBy.push(user.id)
    await comment.save()
    // [FIX] the notification is sent when the comment is liked, not to yourself,
    // and its id is the post (so the client can open the post the comment is on)
    if(comment.user.toString()!==user.id)
        await Notification.create({user:comment.user,subject:{model:'Comment',action:'likeComment',id:post.id},notifier:req.user.id})
    req.comment=comment
    return next()
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
}
static async verifyComment(req,res,next){
    try
    {
        let comment=await Comment.findById(req.body.commentId)
        if(!comment)
        return res.json({success:false,err:'no comment was found'})
        req.comment=comment
        return next()
    }
    catch(err){
        return res.json({success:false,err:err.message})
    }
}
static async checkForOgComment(req,res,next){
    try
    {
        if(!req.body.repliedCommentId)
        return next()
        const ogComment=await Comment.findById(req.body.repliedCommentId)
        if(!ogComment)
        return res.json({success:false,err:'no replied comment was found'})
        req.ogComment=ogComment
        return next()
    }
    // [FIX] was catch{ ... err.message }: err was not defined, so an error crashed the server
    catch(err){
        return res.json({success:false,err:err.message})
    }
}
    static async createComment(req,res,next){
        try
        {
            let {post,ogComment}=req 
            // [NEW] an empty comment is refused
            if(!req.body.content||!String(req.body.content).trim())
                return res.json({success:false,err:'the comment is empty'})
            // [AI OFF] the AI server rated the comment (bad / not bad). Kept, commented out:
            // const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/comment?comment=${req.body.content}`)
            // [CHANGED] without the AI server a comment is not bad and counts as positive
            // (badComment:!data  ->  badComment:false, positivity:true)
            let comment =await Comment.create({
                user:req.user.id,
                postId:req.body.postId,
                content:req.body.content,
                repliedTo:req.body.repliedCommentId||null,
                badComment:false,
                positivity:true
            })
            
            await interestsMiddleWare.updateScore(post.category,!comment.badComment?'positiveComment':'negativeComment',req.user)
            // [CHANGED] no notification for commenting on your own post or replying to yourself,
            // and the id is the post (the client opens the post; a comment has no page of its own)
            // const notification=await Notification.create({user:post.publisher,subject:{model:'Post',action:'createComment',id:comment.id},notifier:req.user.id})
            // if(comment.repliedTo)
            //     await Notification.create({user:ogComment.user,subject:{model:'Comment',action:'replyComment',id:comment.id},notifier:req.user.id})
            if(post.publisher.toString()!==req.user.id)
                await Notification.create({user:post.publisher,subject:{model:'Post',action:'createComment',id:post.id},notifier:req.user.id})
            if(comment.repliedTo&&ogComment.user.toString()!==req.user.id)
                await Notification.create({user:ogComment.user,subject:{model:'Comment',action:'replyComment',id:post.id},notifier:req.user.id})
                req.comment=comment
            return next()
        }
        catch(err)
        {
            return res.json({success:false,err:err.message})
        }
    }
    
} 


























// static async addCommentToUser(userId,commentId){
  
//     const user=await User.findById(userId)
//     user.comments.push(commentId)
//     await user.save()
// console.log('after')

// }
// //remove comment from user record
// static async removeCommentFromUserComments(userId,commentId){

//     const user=await User.findById(userId)
//     user.comments=user.comments.filter(id=>id.toString()!==commentId.toString())
//     await user.save()
   
 
   
// }
module.exports=commentsMiddleware
