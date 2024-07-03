const Post = require('../models/postSchema.js')
const User=require('../models/userSchema.js')
const multer=require('multer')
const mongoose = require('mongoose');
const Comment=require('../models/commentSchema.js')
const fs = require('fs')
const path=require('path')
const util = require('util');
const rmdir=util.promisify(fs.rm)
const readFile = util.promisify(fs.readFile)
const writeFile=util.promisify(fs.writeFile)
const mkdir=util.promisify(fs.mkdir)
const postMiddleware=require('../middleware/postModelSideEffecthandler.js');
const commentsMiddleware = require('../middleware/commentMiddleware.js');
const { ClickAwayListener } = require('@mui/material');
const interestsMiddleWare = require('../middleware/interestsMiddleware.js');
async function  saveFiles(files,postId){
    let filesNames=[]
    let dir=`./uploaded-files/posts-files/${postId}`
    await mkdir(dir,{recursive:true})
   for(let i=0;i<files.length;i++){
    const random=await require('crypto').randomBytes(8).toString('hex')
    const filePath=`${dir}/${random}-${files[i].originalname}`
    await writeFile(filePath,files[i].buffer)
    filesNames.push(`${random}-${files[i].originalname}`)    
}
    return filesNames
}
class postController{
    static async sendPosts(req,res){
        try
        {
            let addPosts=[]
            let posts=[] 
            let post={}
            let seq=0
            let {derivatives,query,user}=req
            const seqs=Object.keys(query)
            let limit=req.headers['limit']
            for (let j = 0; j < derivatives.length; j++) {
                console.log(derivatives)
            const postsNumber=Math.round(limit*derivatives[j].probability)
                for (let i = 1; i <=postsNumber; i++){
                    if(!query[derivatives[j].interest]){
                        continue
                    }
                    seq= Number(query[derivatives[j].interest])+i
                    post=await Post.findOne({postCategorySeq:seq,category:derivatives[j].interest}).limit(postsNumber)
                    if(post)
                    posts.push(post)
                    
                }
            }
            if(posts.length<limit){

                 addPosts=await Post.find().limit(posts.length-limit)
                posts.push(addPosts)
                
            }
            return res.json({success:true,posts,results:derivatives,randomPostsNumber:addPosts.length||0})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
static async sendPost(req,res){
    try
    {
        return res.json({success:true,post:req.post})
    }
    catch(err){
        return res.json({success:false,err:err.message})
    }
}
static async sendUserPosts(req,res){
    try
    {
        console.log('a')
        const user=await User.findById(req.params.userId)
        if(!user)
        return res.json({success:false,err:'no user was found'})
        let {posts}=await user.populate('posts')
        posts=posts.filter(post=>!post.community.communityId)
        posts=posts.map(async(post)=>await post.populate('publisher'))
        
        return res.json({success:true,posts})
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
}

    static async getShares(req,res){
        try{
             let post =await Post.findById(req.query.postId)
            await post.populate('shares.user')
             console.log(post.shares)
                const users=post.shares.map((share)=>share.user)
                console.log(users)
                return res.json({success:true,users})
            }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getReactions(req,res){
        try
        {
            let post=await Post.findById(req.query.postId)
            post =await post.populate('likes')
            post=await post.populate('dislikes')
           let likers=post.likes.map(like=>like)
           let dislikers=post.dislikes.map(dislike=>dislike)
            return res.json({success:true,likers,dislikers})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getFile(req,res){
        try{
            const filePath=path.join(__dirname,'..','uploaded-files','posts-files',req.query.postId,req.params.fileName)
            return res.sendFile(filePath)
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async deleteComment(req,res){
        try{
                          const comment  =await Comment.findById(req.query.commentId)
                            console.log(comment.user.toString())
                            console.log(req.userId)
                          if(comment.user.toString()!==req.userId.toString())
                          return res.json({success:false,err:'not the commenter'})                            
                        if(comment.repliedTo){
                const parentComment=await Comment.findById(comment.repliedTo)
                parentComment.repliedBy=parentComment.repliedBy.filter
                (commentId=>commentId.toString()!==comment.id.toString())
                await parentComment.save()
            } 
                const recursiveDeleteComment=async (oldList,k)=>{
                        let newList=[] 
                            for (let i = 0; i < oldList.length; i++) {
                                const comment=await Comment.findByIdAndDelete(oldList[i])
                                console.log(users,'a')
                                console.log(comment.id,'deleted',k)
                                    k++
                                    newList=newList.concat(comment.repliedBy)
                                
                            }                                 
                            
                            if(!newList.length)
                            {
                            console.log('out')
                                return k
                            }
                           return recursiveDeleteComment(newList,k)
                        
                }                
                    if(comment.repliedBy.length)
                   await recursiveDeleteComment(comment.repliedBy,1)
                  
                  return res.json({succes:true,comment:comment})
            }
        catch(err){
              return res.json({success:false,err:err.message})
        }
    }
    static async createComment(req,res){
        try{
            const comment=await Comment.create({
                user:req.userId,
            content:req.body.content,
            postId:req.body.postId,
            repliedTo:req.body.repliedCommentId||""
        })
        let post=await Post.findById(comment.postId)
        post.comments.push(comment)
       await post.save()
       console.log('before')
     await  commentsMiddleware.addCommentToUser(req.userId,comment.id)
        if(req.body.repliedCommentId){
            //repliedComment is the original comment
            const repliedComment=await Comment.findById(req.body.repliedCommentId)
            repliedComment.repliedBy.push(comment.id)
            await repliedComment.save()
        return res.json({success:true,comment,repliedComment})
    }

    return res.json({success:true,comment})
} 

catch(err){
    return res.json({success:false,err:err.message})
}
}
static async commentReaction(req,res){
    try{
        const comment=await Comment.findById(req.body.commentId)
        if(!comment)
        return req.json({success:false,err:'no coomment found'})
        let user=await User.findById(req.userId)
        const reaction=req.body.reaction
        if(reaction==='like'){
            if(comment.likedBy.some(userId=>userId.toString()===req.userId))
            {
                comment.likedBy=comment.likedBy.filter(userId=>userId.toString()!==req.userId)
                user.commentsLiked=user.commentsLiked.filter(commentId=>commentId.toString()!==comment.id)
                await comment.save()
                await user.save()
                return res.json({success:true,comment})
            }
            
            comment.likedBy.push(req.userId)
            await comment.save()
            
            user.commentsLiked.push(comment.id)
            await user.save()
            console.log(user.commentsLiked)
            return res.json({success:true,comment})
        }
        return res.json({success:false,err:'no reaction was set'})
       }
        catch(err){
        return res.json({success:false,err:err.message})
    }
}
    static async postReaction(req,res){
        try{
                let post=await Post.findById(req.body.postId)
                if(!post)
                return res.json({success:false,err:'post was not found'})
                let user=await User.findById(req.userId)
                if(req.body.reaction==='like')
                {
                    console.log(post.likes)
                    if(post.likes.some(like=>like.user.toString()===req.userId))
                    {
                        post.likes= post.likes.filter(like=>!like.user.toString()===req.userId.toString())
                        console.log('aa')
                        post= await   post.populate('likes.user')
                        await post.save()

                     await   postMiddleware.addPostToUserLikedPosts(req.userId,post.id,false)
                        return res.json({success:true,post})
                    }
                     post.likes.push({user:req.userId})
                     await post.save()   
                    post= await post.populate('likes.user')
                    
                  await  postMiddleware.addPostToUserLikedPosts(req.userId,post.id,true)
                    return res.json({success:true,post})
                }
                if(req.body.reaction==='share'){
                    if(req.userId===post.publisher.toString())
                    return res.json({success:false,err:"you are the poster :)"})
                    if(post.shares.some(share=>(share.user.toString()===req.userId)))
                        return res.json({success:false,err:'you already shared the post  '})
                        await postMiddleware.addUserToPostShares(req.userId,post.id)
                        await    postMiddleware.addPostToUserSharedPost(req.userId,post.id)
                    const newSharedPost=await Post.create({
                        publisher:req.userId,
                        describtion:req.body.describtion,
                        shared:{post:post._id,removed:false}

                    })
                    postMiddleware.addPostToUserPosts(req.userId,newSharedPost.id)
                        return res.json({success:true,newSharedPost,oldPost:post})
                }
                return res.json({success:false,err:'no reaction was specifeid'})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getPostComments(req,res){
        try
        {
            console.log('aa')
            const post=await Post.findById(req.postId)
            if(!post.id)
                return res.json({success:false,err:'no post was found'})
            let comments=await Comment.find({postId:req.query.postId,repliedTo:null}) 
               async function getReplies(comments){
                if(!comments.length)
                return 0
                for (let i = 0; i < comments.length; i++) {
                     await comments[i]
                   .populate('repliedBy')
                   await comments[i].populate('user')
                    comments[i].user={_id:comments[i].user.id,firstName:comments[i].user.firstName,lastName:comments[i].user.lastName,profileImage:comments[i].user.profileImage}
                   await   getReplies(comments[i].repliedBy) 
                }
            }
                await getReplies(comments)
                await interestsMiddleWare.updateScore(post.categorey,'viewComments',req.user)
                return res.json({success:true,comments})
         }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getPost(req,res){
        try{
            const post=await Post.findById(req.query.postId)
            if(!post)
            return res.json({success:false,err:'post was not found'})
            res.json({success:true,post:post})
        }
        catch(err){
            console.log(err.message)
            return res.json({success:false,err:err.message})

        }
    }
    static async createPost(req,res){

        try{
            const {describtion}=req.body
               let style=JSON.parse(req.body.style)
            const post= await Post.create({
                publisher:req.userId,describtion
            })
            const names=await saveFiles(req.files,post.id)
            for (let i = 0; i < names.length; i++) {
                post.files.push({fileName:names[i],style:style[i]})
                
            }
                await post.save()
            await    postMiddleware.addPostToUserPosts(req.userId,post.id)
            return res.json({success:true,post:post})
        }
        catch(err){
            console.log(err.message)
            return res.json({success:false,err:err.message})
        }
    }

}
module.exports=postController