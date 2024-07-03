const Post=require('../models/postSchema.js')
const interestsMiddleWare=require('./interestsMiddleware.js')
const Notification=require('../models/notificationSchema.js')
const fs = require('fs')
const path=require('path')
const util = require('util');
const { post } = require('../routes/postsRoute.js');
const rmdir=util.promisify(fs.rm)
const FormData = require('form-data');
const readFile = util.promisify(fs.readFile)
const axios=require('axios')
const User=require('../models/userSchema.js')
const writeFile=util.promisify(fs.writeFile)
const mkdir=util.promisify(fs.mkdir)
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
class postMiddleware{
    constructor() {
        
    }
    static async updateSeq(req,res,next){
        try{
            let post=req.post
            console.log(post)
            const posts=await Post.find({category:post.category})
            post.postCategorySeq=posts.length+1
            await post.save()
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async classifyPost(req,res,next){
        try
        {
            let {post}=req
            let user=req.user
            if(!req.files.length)
            {
            
                const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/text?text=${req.post.describtion}`)
                await    interestsMiddleWare.updateScore(data,req.action,req.user)
                post.category=data
                await post.save()
                req.post=post
                console.log(post.category)
                return next()
            }
            const file = req.files[0];
            const formData = new FormData();
            formData.append('image',file.buffer, {
              filename: file.originalname,
            });
              let {data} = await axios.post('http://127.0.0.1:5000/api/ai/image', formData, {
                headers: {'content-type':'multipart/form-data',
         } });
         if(data==='basketball'||data==='football'||data==='tennis'||data==='swimming'||data==='car')
         data='sport'
         if(data==='fashion'||data==='music'||data=='food')
         data='entertainment'
         if(data==='news')
         data='politics'
         if(data==='technoogy')
         data='tech'
         await interestsMiddleWare.updateScore(data,req.action,req.user)
         post.category=data
         await post.save()
         req.post=post

         return next()
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
            if(!post.id)
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
            postsList.forEach(async(post)=>{
                await post.delete()
                await interestsMiddleWare.updateScore(post.category,'deletePost',req.user)
                const notification=await Notification.create({user:post.publisher,subject:{model:'Post',action:'deletePost',id:req.query.postId}})
            })

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
            //check if liked
            post.likes= post.likes.filter(id=>id.toString()!==req.user.id)

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
            // checki dslike
            post.dislikes= post.dislikes.filter(id=>id.toString()!==req.user.id)

            // like is a user id
            //check if liked
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
            console.log(req.post)
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
        console.log(req.ogPost,'sssssssssssssssssssssssssssssssssssssssssss')
        req.action='createPost'
        if(req.headers['shared-post-id'])
            req.action='sharePost'
        const {describtion}=req.body
        if(!describtion&&!req.files[0])
        return res.json({success:false,err:'you have sent nothing'})
        let communityId=null
        console.log(describtion)
        let {community}=req
        if(community)
        communityId=community.id
     const post= await Post.create({
         publisher:req.user.id
         ,describtion
         ,sharedPost:{post:req.headers['shared-post-id']||null},
        community:{communityId:communityId||null,removed:false}     })
     const names=await saveFiles(req.files,post.id)
     for (let i = 0; i < names.length; i++) {
         post.files.push({fileName:names[i]})
         
        }
         await post.save()
         req.post=post
         if(req.headers['shared-post-id'])
            await Notification.create({user:ogPost.publisher,subject:{model:'Post',action:'sharedPost',id:post.id,notifier:req.user.id}})   

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
            req.ogPost=ogPost
            if(!ogPost.shares.length)
            return next()
            return next()
        }   
 
            catch(err){
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=postMiddleware