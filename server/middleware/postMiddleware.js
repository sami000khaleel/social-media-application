const Post=require('../models/postSchema.js')
const interestsMiddleWare=require('./interestsMiddleware.js')
const Notification=require('../models/notificationSchema.js')
const fs = require('fs')
const path=require('path')
const util = require('util');
// [FIX] this import made a circular require (routes -> middleware -> routes) and was never used
// const { post } = require('../routes/postsRoute.js');
const rmdir=util.promisify(fs.rm)
// [AI OFF] only used to send pictures and text to the Python AI server (see classifyPost)
// const FormData = require('form-data');
const readFile = util.promisify(fs.readFile)
// const axios=require('axios')
// [NEW] cleans the original name of an upload before it is used in a file path
const {safeFileName}=require('../utils/shape.js')
const User=require('../models/userSchema.js')
const writeFile=util.promisify(fs.writeFile)
const mkdir=util.promisify(fs.mkdir)
async function  saveFiles(files,postId){
    let filesNames=[]
    let dir=`./uploaded-files/posts-files/${postId}`
    await mkdir(dir,{recursive:true})
   for(let i=0;i<files.length;i++){
    const random=await require('crypto').randomBytes(8).toString('hex')
    // [SECURITY] the original name could contain "../" and write outside the post folder
    // const filePath=`${dir}/${random}-${files[i].originalname}`
    const fileName=`${random}-${safeFileName(files[i].originalname)}`
    const filePath=`${dir}/${fileName}`
    await writeFile(filePath,files[i].buffer)
    filesNames.push(fileName)    
}
    return filesNames
}
class postMiddleware{
    constructor() {
        
    }
    static async updateSeq(req,res,next){
        try{
            let post=req.post
            // [CHANGED] posts inside a community stay in the community and get no place in the main feed
            if(post.community.communityId)
            return next()
            // [FIX] the next number after the highest one in this category
            // why: counting the posts gave the same number twice after a post was deleted,
            // and the feed finds posts by this number
            // const posts=await Post.find({category:post.category})
            // post.postCategorySeq=posts.length+1
            const newest=await Post.findOne({category:post.category,postCategorySeq:{$gte:1}}).sort({postCategorySeq:-1})
            post.postCategorySeq=newest?newest.postCategorySeq+1:1
            await post.save()
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    // [CHANGED] the category is no longer guessed by the AI server: the publisher chooses it
    // (createPost already checked it). A shared post keeps the category of the original post
    // and a community post takes the category of its community.
    // The scoring of the action (createPost / sharePost) stays here, as before.
    static async classifyPost(req,res,next){
        try
        {
            let {post}=req
            await interestsMiddleWare.updateScore(post.category,req.action,req.user)
            return next()

            // [AI OFF] the original classification by the Python AI server, kept and commented out:
            // let user=req.user
            // if(!req.files.length)
            // {
            //
            //     const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/text?text=${req.post.describtion}`)
            //     await    interestsMiddleWare.updateScore(data,req.action,req.user)
            //     post.category=data
            //     await post.save()
            //     req.post=post
            //     console.log(post.category)
            //     return next()
            // }
            // const file = req.files[0];
            // const formData = new FormData();
            // formData.append('image',file.buffer, {
            //   filename: file.originalname,
            // });
            //   let {data} = await axios.post('http://127.0.0.1:5000/api/ai/image', formData, {
            //     headers: {'content-type':'multipart/form-data',
            //  } });
            //  if(data==='basketball'||data==='football'||data==='tennis'||data==='swimming'||data==='car')
            //  data='sport'
            //  if(data==='fashion'||data==='music'||data=='food')
            //  data='entertainment'
            //  if(data==='news')
            //  data='politics'
            //  if(data==='technoogy')
            //  data='tech'
            //  await interestsMiddleWare.updateScore(data,req.action,req.user)
            //  post.category=data
            //  await post.save()
            //  req.post=post
            //
            //  return next()
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getPostPublisher(req,res,next){
        try
        {
            const {post}=req
            const publihser=await User.findById(post.publisher)
            req.publihser=publihser
            return next()
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getPosts(req,res,next){
        try
        {
            let {user}=req
            let postsList=[]
            for (let i = 0; i < user.posts.length; i++) {
                let post=await Post.findById(user.posts[i])
                postsList.push(post)
                
            }
            req.postsList=postsList
            return next()
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getPost(req,res,next){
        try
        {   
            const post=await Post.findById(req.body.postId||req.query.postId)
            // [FIX] was if(!post.id): for an unknown id post is null and post.id crashed
            if(!post)
            return res.json({success:false,err:'post was not found'})
            req.post=post
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }}
    static async getComments(req,res,next){
        try
        {
            let {postsList}=req
            let commentsList=[]
            for (let i = 0; i < postsList.length; i++) 
            {await postsList[i].populate('comments') 
            for (let j = 0; j < postsList[i].comments.length; j++) 
                commentsList.push(postsList[i].comments[j])
            }
        req.commentsList=[... commentsList]
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }  static async getPostsList(req,res,next){
        try
        {
            
            let postsList=[]
            postsList.push(req.post)
            req.postsList=postsList
                return next()
        
    }
        catch(err){
            return res.json({success:false,err:err.message})
        }}
        static async getQueriedPost(req,res,next){
            try
            {
                const post=await Post.findById(req.query.postId)
                if(!post)
                return res.json({success:false,err:'no post was found'})
                req.post=post
                return next()
            }
            catch(err){
                return res.json({success:false,err:err.message})
            }}
    static async deletePosts(req,res,next){
        try
        {
            let {postsList}=req
            const {user}=req
            // [FIX] a for loop instead of postsList.forEach(async ...): forEach does not wait, so the answer
            // was sent before the posts were deleted. post.delete() -> post.deleteOne() (delete() is not in Mongoose 6).
            // The notification id is the post id (it was req.query.postId, empty when a user deletes the account)
            for (const post of postsList) {
                await post.deleteOne()
                await interestsMiddleWare.updateScore(post.category,'deletePost',req.user)
                const notification=await Notification.create({user:post.publisher,subject:{model:'Post',action:'deletePost',id:post.id}})
            }

            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async updateLikes(req,res,next){
        try{
            let {post,user}=req
            // like is a user id
            // [FIX] the old first line removed the user's like before checking it, so a post could never be unliked
            // and every click added another +3:
            // post.likes= post.likes.filter(id=>id.toString()!==req.user.id)
            // Now a like replaces a dislike (and the score of the dislike is taken back)
            if(post.dislikes.some(dislike=>dislike.toString()===req.user.id)){
                post.dislikes= post.dislikes.filter(id=>id.toString()!==req.user.id)
                await interestsMiddleWare.updateScore(post.category,'undislikePost',req.user)
            }
            //check if liked
            if(post.likes.some(like=>like.toString()===req.user.id))
             {
                // user unlikes it
                req.action='unlikePost'
                post.likes = post.likes.filter(like=>like.toString()!==req.user.id)
                await post.save()
                   req.post=post
                   req.like=false 
                   await interestsMiddleWare.updateScore(post.category,req.action,req.user)
                   return next()
                }     
                // otherwise user likes it
                req.action='likePost'
            post.likes.push(req.user.id)
            await post.save()
            req.post=post
            req.like=true
            await interestsMiddleWare.updateScore(post.category,req.action,req.user)
            return next()

        }
        catch(err)
        {
                return res.json({success:false,err:err.message})
        }
    }
    static async updateDisikes(req,res,next){
        try{
            let {post,user}=req
            // [FIX] same bug as updateLikes: the dislike was removed before the check, so it could not be undone
            // post.dislikes= post.dislikes.filter(id=>id.toString()!==req.user.id)
            // Now a dislike replaces a like (the like is also removed from user.postsLiked)
            if(post.likes.some(like=>like.toString()===req.user.id)){
                post.likes= post.likes.filter(id=>id.toString()!==req.user.id)
                user.postsLiked=user.postsLiked.filter(postId=>postId.toString()!==post.id)
                await interestsMiddleWare.updateScore(post.category,'unlikePost',req.user)
            }
            //check if disliked
            if(post.dislikes.some(dislike=>dislike.toString()===req.user.id))
             {
                // user unlikes it
                req.action='undislikePost'
                post.dislikes = post.dislikes.filter(dislike=>dislike.toString()!==req.user.id)
                await post.save()
                   req.post=post
                   req.dislike=false 
                   await interestsMiddleWare.updateScore(post.category,req.action,req.user)
                   return next()
                }     
                // otherwise user dislikes it
                req.action='dislikePost'
            post.dislikes.push(req.user.id)
            await post.save()
            req.post=post
            req.dislike=true
            await interestsMiddleWare.updateScore(post.category,req.action,req.user)
            return next()

        }
        catch(err)
        {
            console.log(err)
                return res.json({success:false,err:err.message})
        }
    }
    static async updatePostDescribtion(req,res,next){
        try{
            req.post.describtion=req.body.describtion
            let post=req.post
            await post.save()
            const notification=await Notification.create({user:req.user.id,subject:{model:'Post',action:'updatePost',id:req.post.id}})
            return res.json({success:true,post})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async verifyPostAuthor(req,res,next){
        try{
            let {user}=req
        let post=await Post.findById(req.body.postId||req.query.postId)
            req.post=post
        if(!post)
        return res.json({success:false,err:'post was not found'})    
        if(post.publisher.toString()!==user.id)
        return res.json({success:false,err:'you are not the publisher'})
        return next()
    }

        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async createPost(req,res,next){
    try{
        const ogPost=req.ogPost
        req.action='createPost'
        if(req.headers['shared-post-id'])
            req.action='sharePost'
        const {describtion}=req.body
        // [FIX] req.files is undefined when a request has no multipart body, req.files[0] crashed
        const files=req.files||[]
        req.files=files
        // [CHANGED] a share without text is allowed
        if(!describtion&&!files[0]&&!ogPost)
        return res.json({success:false,err:'you have sent nothing'})
        let communityId=null
        let {community}=req
        if(community){
        communityId=community.id
        // [SECURITY] only members can post in a community (anyone could before)
        if(community.members.every(({memberId})=>memberId.toString()!==req.user.id))
        return res.json({success:false,err:'only members can post in this community'})
        }
        // [CHANGED] the publisher chooses the category (it came from the AI server in classifyPost)
        let category=req.body.category
        if(ogPost)
        category=ogPost.category
        if(community)
        category=community.category
        if(!interestsMiddleWare.CATEGORIES.includes(category))
        return res.json({success:false,err:'choose a category for the post: '+interestsMiddleWare.CATEGORIES.join(', ')})
     const post= await Post.create({
         publisher:req.user.id
         ,describtion
         ,category
         // [CHANGED] ogPost can be the original of a share (see validateShare)
         ,sharedPost:{post:ogPost?ogPost.id:null},
        community:{communityId:communityId||null,removed:false}     })
     const names=await saveFiles(req.files,post.id)
     for (let i = 0; i < names.length; i++) {
         post.files.push({fileName:names[i]})
         
        }
         await post.save()
         req.post=post
         // [FIX] notifier was inside subject (where the schema has no such field, so it was lost),
         // and you no longer get a notification for sharing your own post
         if(ogPost&&ogPost.publisher.toString()!==req.user.id)
            await Notification.create({user:ogPost.publisher,notifier:req.user.id,subject:{model:'Post',action:'sharedPost',id:post.id}})   

         await Notification.create({user:req.user.id,subject:{model:'Post',action:'createPost',id:post.id}})   
          return next()
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:'post was not added to req object'})
    }
    }
    
    static async validateShare(req,res,next){
        try{
            if(!req.headers['shared-post-id'])
            return next()
            
            let ogPost=await Post.findById(req.headers['shared-post-id'])
            // [FIX] an unknown id crashed on ogPost.shares
            if(!ogPost)
            return res.json({success:false,err:'the shared post was not found'})
            // [CHANGED] sharing a share points to the original post, so shares never nest
            if(ogPost.sharedPost.post){
                const root=await Post.findById(ogPost.sharedPost.post)
                if(root)
                ogPost=root
            }
            req.ogPost=ogPost
            return next()
        }   
 
            catch(err){
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=postMiddleware
