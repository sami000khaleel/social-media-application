const User=require('../models/userSchema.js')
const Post=require('../models/postSchema.js')
const Comment=require('../models/commentSchema.js')
const util = require('util');
const CommentModelSideEffectHandler=require('./commentMiddleware.js')
const  fs=require('fs');
const rmdir=util.promisify(fs.rm)
class postModelSideEffectHandler{
    constructor(){

    } 
    static async removeCommunity(req,res,next){
        try
        {
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) {
                postsList[i].community.removed=true
               await postsList[i].save()
                
            }
            req.postsList=postsList
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async deleteFiles(req,res,next){
        try{
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) 
                await rmdir(`./uploaded-files/posts-files/${postsList[i].id}`,{recursive:true})
return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removePostsFromOgShares(req,res,next){
        try
        {
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) {
                console.log(postsList[i].id)
                let ogPost=await Post.findById(postsList[i].sharedPost.post)
                
                if(!ogPost)
                return next()
                for (let j = 0; j < ogPost.shares.length; j++) {
                    console.log(ogPost.shares[j].post.toString(),'ssss',postsList[i].id)     
                    if(ogPost.shares[j].post.toString()===postsList[i].id)
                        {   ogPost.shares.splice(j,1)
                            console.log('match')
                        }}
                await ogPost.save()                                        
                         console.log('succcesssss')
            }
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removePostsFromShares(req,res,next){
        try{
            console.log('removving the share')
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) 
                for (let j = 0; j < postsList[i].shares.length; j++) {
                    let sharePost=await Post.findById(postsList[i].shares[j].post)
                    sharePost.sharedPost.removed=true
                    await sharePost.save()
                     }                                                   
               return next() 
            }          
            catch(err){
                return res.json({success:false,err:err.message})
            }
        
        }
    static async removeComments(req,res,next){
        try
        {
            console.log('ssssssssssss')
            let {comment,commentsList}=req
                for (let i = 0; i < commentsList.length; i++) 
                {
                    console.log('post Id ',commentsList[i].postId)
                    let post=await Post.findById(commentsList[i].postId)
                    console.log('before post remove',post.comments.length)
                    for (let j = 0; j < post.comments.length; j++) 
                                if(post.comments[j].toString()===commentsList[i].id)
                                    post.comments.splice(j,1)                        
                                    console.log('after post delete',post.comments.length)
                                    await post.save()    
                }
                return next()
            }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addComment(req,res,next){
        try{
            let post=await Post.findById(req.body.postId)
                if(!post)
                return res.json({success:false,err:'no post was found'})
                post=await post.populate('comments')
                post.comments.push(req.comment)
                let counter=0
                if(post.comments.length<20)
                    post.badComments=false
                if(post.comments.length>=20)
                {for (let i = 0; i < post.comments.length; i++) 
                {
                    if(post.comments[i].badComment)
                        counter++

                }
                if((counter/post.comments.length)>=0.5)
                    post.badComments=true
                if((counter/post.comments.length)<0.5)
                    post.badComments=false

            }
                
                await post.save()
              return next()

        }
        catch(err){

        }
    }
    static async addPosterIdToOriginalPostShares(req,res,next){
        try{
            if(!req.post.sharedPost.post)
            return next()
            // console.log(req.post.sharedPost.post)
            let originalPost=await Post.findById(req.post.sharedPost.post)
            originalPost.shares.push({user:req.userId,post:req.post.id})
            await originalPost.save()
            console.log(originalPost)
            req.ogPost=originalPost
           return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
            static async addPostToUserPosts(userId,postId){
        try{
        let  user=await User.findById(userId)
      user.posts.push(postId)
      await user.save()
      console.log(user.posts)}
      catch(err){
        console.log(err.message)
        return res.jsoN
    }
    }
    static async addUserToPostShares(userId,postId){
        const post=await Post.findById(postId)
        post.shares.push({user:userId})
        await post.save()
    }
    static async addPostToUserLikedPosts (userId,postId,like){
        try{
        let  user=await User.findById(userId)
        console.log(like)
        if(like){
        user.postsLiked.push(postId)
        await user.save()
    }
if(!like){
    console.log('aaa')
user.postsLiked=user.postsLiked.filter(id=>id.toString()!==postId.toString())
await user.save()
}}
catch(err){
console.log(err.message)
}
}
    static async addPostToUserSharedPost(userId,postId){
        try{const user=await User.findById(userId)
        user.postsShared.push(postId)
        await user.save()}
        catch(err){
console.log(err.message)       
 }
    
    }
    //delete post from user record
    //remove the shared post

    static async deletePostFromUserRecord(userId,postId){
      try{
        let user=await User.findById(userId)
        if(user.posts.length){
        user.posts=user.posts.filter(id=>id.toString()!==postId.toString())
       await user.save()
        const userPost=await Post.findById(postId)
        console.log(userPost)
        // find people who shared and delete post from their postsShared record
        if(userPost.shares.length){
            // share is the id of the user who shared
        userPost.shares.forEach(async(share)=>{
            // get the user who shared the post
            let sharer=await User.findById(share.user)
            // filter the shared posts list from user doc            
            sharer.postsShared=sharer.postsShared.filter(id=>id.toString()!==postId.toString())
            console.log(sharer)
            await sharer.save()
        })}
        //see if post has likes
        if(userPost.likes.length){
            // remove post from posts liked record in user doc
 
            userPost.likes.forEach(async(like)=>{
                  // find likers and filter the post from postsLiked list             
                console.log(like.user)
                  let liker =await User.findById(like.user)
                console.log(liker)
                liker.postsLiked=liker.postsLiked.filter(id=>id.toString()!==postId.toString())
                await liker.save()
            })
        }
        }
    await user.save()

}
    catch(err){
console.log(err)    }
    }
    // remove the post from the shares list



    static async removePostsFromPostsRecord(req,res,next){
        try
        {
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) {
                let sharePost=await Post.findById()
                
            }
        }
            catch(err){
            console.log(err)
        }
    }
    // check if the user if the post owner
    static async validatePostAction(req,res,next){
        try{
            const post =await Post.findById(req.query.postId)
            if(req.userId.toString()===post.publisher.toString())
            return next()
            return res.json({success:false,err:'your not the owner of the post'})
        }
        catch(err){
            console.log(err)
            }
    }
}
module.exports=postModelSideEffectHandler