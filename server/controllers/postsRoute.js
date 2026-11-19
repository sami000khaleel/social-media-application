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
// [FIX] a React UI library imported in the server: it crashed the start unless @mui was installed, and was unused
// const { ClickAwayListener } = require('@mui/material');
// [NEW] POST_POPULATE: what every post sent to the client carries (publisher, shared post, community name)
const {POST_POPULATE,USER_CARD,isId,isPlainFileName}=require('../utils/shape.js')
// [NEW] sends uploaded files; draws a missing demo picture again (see utils/sendUpload.js)
const sendUpload=require('../utils/sendUpload.js')
const interestsMiddleWare = require('../middleware/interestsMiddleware.js');
// [NEW] each page of the feed is saved with its calculation, and announced over Socket.IO
const FeedLog=require('../models/feedLogSchema.js')
const realtime=require('../realtime.js')
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
    // [CHANGED] sendPosts was rewritten. The idea is the same (each interest gets its share of the page,
    // found by postCategorySeq), these were the problems in the old version:
    //  - Math.round of every share: the shares did not add up to the page size (10 x 0.15 rounds to 2 + 2 + ...)
    //  - posts.push(addPosts) put an ARRAY inside the list of posts
    //  - .limit(posts.length-limit) was a negative number
    //  - an interest that was not in the query was skipped completely
    //  - the same post could come twice (filler posts were not excluded)
    //  - posts were sent without their publisher, so the client could not show a name
    // How it works now:
    // calcInterests has put the share of every interest in req.derivatives.
    // The client sends, for every interest, the lowest postCategorySeq it already has
    // (?tech=14&sport=9 ..., nothing or 0 for a fresh feed) and the page size in the limit header.
    // Each interest gives its share of the page, newest posts first (lower numbers on the next page).
    //
    // The original version, kept for reference:
    // static async sendPosts(req,res){
    //     try
    //     {
    //         let addPosts=[]
    //         let posts=[]
    //         let post={}
    //         let seq=0
    //         let {derivatives,query,user}=req
    //         const seqs=Object.keys(query)
    //         let limit=req.headers['limit']
    //         for (let j = 0; j < derivatives.length; j++) {
    //             console.log(derivatives)
    //         const postsNumber=Math.round(limit*derivatives[j].probability)
    //             for (let i = 1; i <=postsNumber; i++){
    //                 if(!query[derivatives[j].interest]){
    //                     continue
    //                 }
    //                 seq= Number(query[derivatives[j].interest])+i
    //                 post=await Post.findOne({postCategorySeq:seq,category:derivatives[j].interest}).limit(postsNumber)
    //                 if(post)
    //                 posts.push(post)
    //
    //             }
    //         }
    //         if(posts.length<limit){
    //
    //              addPosts=await Post.find().limit(posts.length-limit)
    //             posts.push(addPosts)
    //
    //         }
    //         return res.json({success:true,posts,results:derivatives,randomPostsNumber:addPosts.length||0})
    //     }
    //     catch(err){
    //         console.log(err)
    //         return res.json({success:false,err:err.message})
    //     }
    // }
    static async sendPosts(req,res){
        try
        {
            let posts=[]
            let addPosts=[]
            let {derivatives,query}=req
            // [CHANGED] 30 posts a page by default (was 10), at most 50
            const limit=Math.min(Math.max(parseInt(req.headers['limit'])||interestsMiddleWare.PAGE_SIZE,1),50)
            // [NEW] turn the shares into whole numbers of posts that add up to the page size
            // (interestsMiddleWare.allocate: floor every share, then give the posts that are left
            //  to the interests with the biggest remainders), then make room for the random surprise posts
            const surprises=interestsMiddleWare.planPage(req.mix,limit)
            interestsMiddleWare.pickSurprises(derivatives,surprises)
            // [NEW] why each post is on the page: 'week', 'session', 'surprise' or (below) 'filler'
            const reasons=new Map()

            // [NEW] where the next post of an interest comes from: below the lowest number the client already has
            const below=seq=>seq>0?{$lt:seq}:{$gte:1}
            const cursors={}
            for (let j = 0; j < derivatives.length; j++) {
                const interest=derivatives[j].interest
                cursors[interest]=Number(query[interest])||0
                // [CHANGED] a topic gets its posts from the week half, from the session half, or (only topics the
                // page gave nothing) its surprises
                const fromWeek=req.mix.week.derivatives[j].postsNumber
                const fromSession=req.mix.session.derivatives[j].postsNumber
                const wanted=fromWeek+fromSession+derivatives[j].exploreNumber
                if(!wanted)
                    continue
                const found=await Post.find({category:interest,postCategorySeq:below(cursors[interest])})
                    .sort({postCategorySeq:-1}).limit(wanted).populate(POST_POPULATE)
                const sessionReason=req.mix.session.basis==='session'?'session':'week'
                found.forEach((post,k)=>reasons.set(post.id,k<fromWeek?'week':k<fromWeek+fromSession?sessionReason:'surprise'))
                if(found.length)
                    cursors[interest]=found[found.length-1].postCategorySeq
                posts=posts.concat(found)
            }
            // an interest ran out of posts: fill the page with the newest posts that are left
            // [FIX] only posts the client does not have yet (below every cursor), populated, and flat
            if(posts.length<limit){
                const rest=derivatives.map(obj=>({category:obj.interest,postCategorySeq:below(cursors[obj.interest])}))
                addPosts=await Post.find({$or:rest}).sort({createdAt:-1}).limit(limit-posts.length).populate(POST_POPULATE)
                posts=posts.concat(addPosts)
            }
            // [CHANGED] newest first, and [NEW] basis says which time window decided the mix (see calcInterests)
            posts.sort((a,b)=>b.createdAt-a.createdAt)
            // [NEW] every page that is sent is written down with its calculation (see models/feedLogSchema.js)
            // and pushed to the user's open "How my feed works" page
            const fillers=new Set(addPosts.map(post=>post.id))
            const log=await FeedLog.create({
                user:req.user.id,basis:req.basis,limit,results:derivatives,halves:interestsMiddleWare.halvesOf(req.mix),
                posts:posts.map(post=>({post:post.id,category:post.category,reason:fillers.has(post.id)?'filler':reasons.get(post.id)}))
            })
            realtime.toUser(req.user.id,'feed',{_id:log.id})
            return res.json({success:true,posts,results:derivatives,halves:interestsMiddleWare.halvesOf(req.mix),basis:req.basis,surprises,randomPostsNumber:addPosts.length})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
static async sendPost(req,res){
    try
    {
        // [CHANGED] the client gets the post with its publisher, shared post and community name,
        // plus like / dislike (true when the request added the reaction, false when it removed it)
        await req.post.populate(POST_POPULATE)
        return res.json({success:true,post:req.post,like:req.like,dislike:req.dislike})
    }
    catch(err){
        return res.json({success:false,err:err.message})
    }
}
static async sendUserPosts(req,res){
    try
    {
        const user=await User.findById(req.params.userId)
        if(!user)
        return res.json({success:false,err:'no user was found'})
        // [NEW] a demo visitor's private copy shows the posts of the person it was copied from
        const publisherId=user.demoCloneOf?user.demoCloneOf.toString():user.id
        // [FIX] the old version sent a list of unfinished promises (posts.map(async ...)), which became {} in JSON.
        // It also missed posts that were not in user.posts. Now: one query, newest first, publisher populated.
        // let {posts}=await user.populate('posts')
        // posts=posts.map(async(post)=>await post.populate('publisher'))
        let posts=await Post.find({publisher:publisherId}).sort({createdAt:-1}).populate(POST_POPULATE)
        posts=posts.filter(post=>!post.community.communityId)
        
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
            // [FIX] an unknown id crashed on post.populate
            if(!post)
            return res.json({success:false,err:'post was not found'})
            // [SECURITY] only name and picture of the people who reacted (it sent whole user documents)
            // post =await post.populate('likes')
            // post=await post.populate('dislikes')
            post =await post.populate({path:'likes',select:USER_CARD})
            post=await post.populate({path:'dislikes',select:USER_CARD})
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
            // [SECURITY] path traversal: fileName "../../.env" could read any file of the server.
            // Only a post id and a plain file name are accepted now.
            if(!isId(req.query.postId)||!isPlainFileName(req.params.fileName))
            return res.status(400).json({success:false,err:'invalid file'})
            const filePath=path.join(__dirname,'..','uploaded-files','posts-files',req.query.postId,req.params.fileName)
            // [CHANGED] a missing demo picture is drawn again from its name instead of failing with ENOENT
            // return res.sendFile(filePath)
            return sendUpload(res,filePath)
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
            // [FIX] the post id comes from the query (req.postId never existed, so this route always failed)
            // const post=await Post.findById(req.postId)
            // if(!post.id)
            const post=await Post.findById(req.query.postId)
            if(!post)
                return res.json({success:false,err:'no post was found'})
            // [CHANGED] oldest comment first, like a conversation
            let comments=await Comment.find({postId:req.query.postId,repliedTo:null}).sort({createdAt:1})
               async function getReplies(comments){
                if(!comments.length)
                return 0
                for (let i = 0; i < comments.length; i++) {
                     await comments[i]
                   .populate('repliedBy')
                   // [CHANGED] populate only name and picture instead of replacing user by hand
                   // await comments[i].populate('user')
                   // comments[i].user={_id:comments[i].user.id,firstName:comments[i].user.firstName,lastName:comments[i].user.lastName,profileImage:comments[i].user.profileImage}
                   // why: assigning a plain object to a ref field is cast back to an id by mongoose, so the name was lost
                   await comments[i].populate({path:'user',select:USER_CARD})
                   await   getReplies(comments[i].repliedBy) 
                }
            }
                await getReplies(comments)
                // [FIX] typo post.categorey -> post.category (viewComments was never scored)
                await interestsMiddleWare.updateScore(post.category,'viewComments',req.user)
                return res.json({success:true,comments})
         }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async getPost(req,res){
        try{
            // [CHANGED] populated like every other post the client gets
            const post=await Post.findById(req.query.postId).populate(POST_POPULATE)
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
