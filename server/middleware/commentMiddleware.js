const Comment=require('../models/commentSchema.js')
const axios = require('axios');
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
            comments.forEach(async(comment)=>await comment.delete())
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
            const notification=await Notification.create({user:req.user.id,subject:{model:'Comment',action:'updateComment',id:comment.id}})
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
    {   // remove like
        await interestsMiddleWare.updateScore(post.category,comment.positivity?'undislikePositiveComment':'undislikeNegativeComment',user)
        req.dislike=false
        comment.dislikedBy=comment.dislikedBy.filter(userId=>userId.toString()!==user.id)
    await comment.save()
        await Notification.create({user:comment.user,subject:{model:'Comment',action:'dislikeComment',id:comment.id},notifier:req.user.id})
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
        await interestsMiddleWare.updateScore(post.category,comment.positivity?'undislikePositiveComment':'undislikeNegativeComment',user)
        req.like=false
        comment.likedBy=comment.likedBy.filter(userId=>userId.toString()!==user.id)
    await comment.save()
        await Notification.create({user:comment.user,subject:{model:'Comment',action:'likeComment',id:comment.id},notifier:req.user.id})
        return next()
}
    // otherwise like
    await interestsMiddleWare.updateScore(post.category,comment.positivity?'likePositiveComment':'likeNegativeComment',user)

    req.like=true
    comment.likedBy.push(user.id)
    await comment.save()
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
    catch{
        return res.json({success:false,err:err.message})
    }
}
    static async createComment(req,res,next){
        try
        {
            let {post,ogComment}=req 
            const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/comment?comment=${req.body.content}`)           
            let comment =await Comment.create({
                user:req.user.id,
                postId:req.body.postId,
                content:req.body.content,
                repliedTo:req.body.repliedCommentId||null,
                badComment:!data
            })
            
            await interestsMiddleWare.updateScore(post.category,!comment.badComment?'positiveComment':'negativeComment',req.user)
            const notification=await Notification.create({user:post.publisher,subject:{model:'Post',action:'createComment',id:comment.id},notifier:req.user.id})
            if(comment.repliedTo)
                await Notification.create({user:ogComment.user,subject:{model:'Comment',action:'replyComment',id:comment.id},notifier:req.user.id})
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