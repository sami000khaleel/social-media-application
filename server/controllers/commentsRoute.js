const Post=require('../models/postSchema.js')
const interestsMiddleWare = require("../middleware/interestsMiddleware")

class commentController{
    constructor(){

    }
    static async sendComment(req,res){
        try
        { 
            let {comment}=req
            if(req.method==='DELETE')
{
    let post=await Post.findById(comment.postId)
    // [FIX] the post can already be gone (deleted with its comments); without this check post.category crashed
    if(post)
  await  interestsMiddleWare.updateScore(post.category,comment.positivity?'deletePositiveComment':'deleteNegativeComment',req.user)
}
    return res.json({success:true,comment:comment})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=commentController
