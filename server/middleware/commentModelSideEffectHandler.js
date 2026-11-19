const Comment =require('../models/commentSchema.js')
const Notification=require('../models/postSchema.js')

class commentModelSideEffectHandler{
    constructor(){

    }
 
    static async deletePostComments(req,res,next){
        try 
        {
            comments.forEach(async(comment)=>{
            
            })
            req.commentsList=[... deletedComments]
            console.log(req.commentsList.length,req.commentsList)
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeCommentFromOgComment(req,res,next){
        try 
        {
            let {comment}=req
            if(!comment.repliedTo)
            return next()            
            
            let ogComment=await Comment.findById(comment.repliedTo)
            // [FIX] the parent comment can already be deleted
            if(!ogComment)
            return next()
            // [FIX] the filtered list is assigned now. Before, the result of filter() was thrown away
            // (and the callback was async, so it returned a promise and kept every id)
            ogComment.repliedBy=ogComment.repliedBy.filter(commentId=>
                commentId.toString()!==comment.id)
                await ogComment.save()
                return next()
            }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addCommentToOgComment(req,res,next){
        try 
        {
            if(!req.comment.repliedTo)
            return next()
            req.ogComment.repliedBy.push(req.comment.id)
           let ogComment=req.ogComment
            await  ogComment.save()
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=commentModelSideEffectHandler
