const User=require('../models/userSchema.js')
const Comment=require('../models/commentSchema.js')
const fs=require('fs')
const Notification=require('../models/notificationSchema.js')
const util=require('util')
const { json } = require('body-parser')
const interestsMiddleWare = require('./interestsMiddleware.js')
const mkdir=util.promisify(fs.mkdir)
const readFile=util.promisify(fs.readFile)
const writeFile=util.promisify(fs.writeFile)
class userModelSideEffectHandler{
    constructor(){
    }
    static async blockCommunity(req,res,next){
        try
        {
            let {user,community}=req
            if(user.blockedCommunities.some(id=>id.toString()===community.id))
                {user.blockedCommunities= user.blockedCommunities.filter(id=>id.toString()!==community.id)
                    await user.save()
                    return next()
                }
                user.blockedCommunities.push(community.id)
                await user.save()
                req.user=user
                console.log('asdsa')
                return next()
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async blockUser(req,res,next){
        try
        {
            let {user,blockedUser,community}=req
            console.log(req.user,'shoul')
            if(user.blockedUsers.length)
            if(user.blockedUsers.some(id=>id.toString()===blockedUser.id))
                {user.blockedUsers= user.blockedUsers.filter(id=>id.toString()!==blockedUser.id)
                    await user.save()
                    req.user=user
                    console.log('dasdas')
                    return next()
                }
                user.blockedUsers.push(blockedUser.id)
                await user.save()
                return next()
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async removeMembers(req,res,next){
        try
        {
            let {community}=req
            for (let i = 0; i < community.members.length; i++)
            {
                let member=await User.findById(community.members[i].memberId)
                member.communities=member.communities.filter(({communityId})=>communityId.toString()!==community.id)
                await member.save()
            }
            return next()            
            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async deleteFromFriends(req,res,next){
        try
        {
            let {user}=req
            for (let i = 0; i < user.friends.length; i++) {
                let friend=await User.findById(user.friends[i])
                friend.friends=friend.friends.filter(id=>id.toString()!==user.id)
                await friend.save()
            
            }
            return next()
                    }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async approvedCommunity(req,res,next){
        try
        {
            let {community,joiner}=req
                    for (let i = 0; i < joiner.communities.length; i++) 
                            if(joiner.communities[i].communityId.toString()===community.id)
                                  { joiner.communities[i].approved=true  
                                    await joiner.save()                      
                                   return next()
                                }
                                return res.json({success:false,err:'no community was found in joiner record'})
                            }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async removeCommunity(req,res,next){
        try{
            let {community,user}=req
            if(req.query.joinerId||req.body.joinerId){
                let joiner=await User.findById(req.query.joinerId||req.body.joinerId)
                if(!joiner)
                return res.json({success:false,err:'no joiner was found'})
                joiner.communities=joiner.communities.filter(({communityId})=>communityId.toString()!==community.id)
               await joiner.save()
                return next()
            }
            user.communities=user.communities.filter(({communityId})=>communityId.toString()!==community.id)
            await user.save()
            return next()            
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async requestCommunityMembership(req,res,next){
        try{
            let {user,community}=req
            if(user.communities.some(({communityId})=>communityId.toString()===community.id))
            return res.json({success:false,err:'you already on the list'})
            user.communities.push({communityId:community.id})
            await user.save()
            await interestsMiddleWare.updateScore(community.category,'joinCommunity',user)
            await Notification.create({user:community.manager,subject:{model:'Community',action:'membershipRequest',id:community.id},notifier:req.user.id})
            community.admins.forEach(async(admin)=>{
                await Notification.create({user:admin,subject:{model:'Community',action:'membershipRequest',id:community.id},notifier:req.user.id})
            })
            return next()
            
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async updateManagersState(req,res,next){
        try{
            let {newManager,user,community}=req
            newManager.managedCommunities.push(community.id)
            user.managedCommunities=user.managedCommunities.filter(id=>id.toString()!==community.id)
            await newManager.save()
            await user.save()
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeAdmin(req,res,next){
        try{
            let {community,user}=req
            user.adminedCommunities=user.adminedCommunities.filter(commId=>commId.toString()!==community.id)
            await user.save()
            req.user=user
            await Notification.create({user:req.user.id,subject:{model:'Community',action:'adminOut',id:communty.id}})
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeAdmins(req,res,next){
        try{
            let {admins,community}=req
            if(!admins.length)
            return next()
            for (let i = 0; i < admins.length; i++) 
            {
                for(let j=0;j<admins[i].adminedCommunities.length;j++)
                        if(admins[i].adminedCommunities[j].toString()===community.id)
                            admins[i].adminedCommunities.splice(j,1)
                await admins[i].save()
                await Notification.create({user:admins[i].id,subject:{model:'Community',action:'removeAdmin',id:community.id},notifier:req.user.id})

            }
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addAdminedCommunity(req,res,next){
        try
        {
            let {community}=req
            let {admins}= req
            let{user}=req
            admins.forEach(async(admin)=>{admin.adminedCommunities.push(community.id)
            await admin.save()
            await Notification.create({user:admin.id,subject:{model:'Community',action:'addedAdmin',id:community.id},notifier:req.user.id})
            })
            req.admins=admins
            req.community=community
            console.log('dsada')
            return next()                  
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async addManagedCommunity(req,res,next){
        try{
            let user=await User.findById(req.community.manager)
            if(user.managedCommunities.some(id=>id.toString()===req.community.id))
            return res.json({success:false,err:'user already has a manager'})
            user.managedCommunities.push(req.community.id)
            await user.save()
            req.user=user
            return next()
        }
        
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async removeManagedCommunity(req,res,next){
        try
        {
            console.log(req.community)
            let user=await User.findById(req.user.id)
            user.managedCommunities= user.managedCommunities.filter((async(communityId)=>communityId.toString()!==req.community.id))
            await user.save()
            req.user=user
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async removeAdminedCommunity(req,res,next){
        try{  
            let user=await User.findById(req.user.id)
            user.adminedCommunities= user.adminedCommunities.filter(async(communityId=>communityId.toString()!==req.community.id))
            await user.save()
            return next()

        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
   static async addFollow(req,res,next){
    try
    {
        let {user,addedUser}=req
        user.followes.push(addedUser.id)
        await user.save()
        addedUser.followers.push(user.id)
        await addedUser.save()
        req.friend=addedUser
        await Notification.create({user:addedUser.id,notifier:req.user.id,subject:{model:'User',action:'followUser',id:req.user.id}})
        return next()
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
   }
   
    static async removePosts(req,res,next){
        try{    
            let {postsList}=req
            console.log('started removing post')
            for (let i = 0; i < postsList.length; i++) 
                {
                    let user=await User.findById(postsList[i].publisher)
                    for (let j = 0; j < user.posts.length; j++) 
                    if(user.posts[j].toString()===postsList[i].id)
                    user.posts.splice(j,1)
                    await user.save()
                }
                console.log('post removed')
                return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeLikedPosts(req,res,next){
        try
        {
            const {postsList}=req
            for (let i = 0; i < postsList.length; i++) 
                for (let j = 0; j < postsList[i].likes.length; j++) {
                    let user=await User.findById(postsList[i].likes[j])
                    console.log(user)
                        for (let k = 0; k < user.postsLiked.length; k++) 
                            if(user.postsLiked[k].toString()===postsList[i].id)
                                user.postsLiked.splice(k,1)
                    await user.save()
                            }   
                            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeComments(req,res,next){
        try{
                let {commentsList}=req
                    for (let i = 0; i < commentsList.length; i++) {
                        let user=await User.findById(commentsList[i].user)
                        console.log('found user with comments of',user.comments)
                        console.log('now iterating the user')
                        for (let j = 0; j < user.comments.length; j++){ 
                        console.log('uesr comment',commentsList[i].id)
                        console.log('iterated comment',user.comments[j].toString())    
                        if(user.comments[j].toString()===commentsList[i].id)
                            {
                                    console.log('found a match')
                                    user.comments.splice(j,1)
                                    await user.save()
                            }
                        }
                            
                        }
                        console.log('done removing comments')
                        return next()
                        
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async removeLikes(req,res,next){
        try
        {
            let {commentsList}=req
            console.log('removing likes',commentsList.length)
         for (let i = 0; i < commentsList.length; i++) 
         {
            for (let j = 0; j < commentsList[i].likedBy.length; j++) {
                let user=await User.findById(commentsList[i].likedBy[j])
                for (let k = 0; k < user.commentsLiked.length; k++) 
                    if(user.commentsLiked[k].toString()===commentsList[i].id)
                            user.commentsLiked.splice(k,1)
            
                await user.save()
                        }
         }
         console.log('done removing likes')
         return next()
    }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addLikedComment(req,res,next){
        try
        {
            let {like,user,comment}=req
          if(like)
            user.commentsLiked.push(comment.id)
            if(!like)
            user.commentsLiked=user.commentsLiked.filter(liekedCommentId=>liekedCommentId.toString()!==comment.id)
          await user.save()
          return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addComment(req,res,next){
        try
        {
           let user=await User.findById(req.user.id)
           user.comments.push(req.comment.id)
         await user.save()
         req.user=user
           return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async addPostToPublisherPosts(req,res,next){
        try
        {
            req.user.posts.push(req.post.id)
            let user=req.user
            await user.save()
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async updateLikes(req,res,next){
        try
        {
            
           let {user}=req
            console.log(req.like)
            if(req.like)
            user.postsLiked.push(req.post.id)
            if(!req.like)
          user.postsLiked=user.postsLiked.filter(postId=>postId.toString()!==req.post.id.toString())
        
        await user.save()
        const notification=await Notification.create({user:req.post.publisher,subject:{model:'Post',action:'likePost',id:req.post.id},notifier:req.user.id})
        
            return next()
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async deletePost(req,res,next){
        try
        {
            let user={req}
            user.posts=user.posts.filter(postId=>postId.toString()!==req.post.id)
            return next()

        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    
}
module.exports=userModelSideEffectHandler