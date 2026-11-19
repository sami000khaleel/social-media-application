const fs=require('fs')
const {promisify}=require('util')
const {resolve}=require('path')
const exists=promisify(fs.exists)
const Post=require('../models/postSchema.js')
const unlink=promisify(fs.unlink)
const Notification=require('../models/notificationSchema.js')
const Community = require('../models/communitySchema.js');
const interestsMiddleWare = require('../middleware/interestsMiddleware.js')
// [NEW] shared helpers (what a populated post / a user card contains, checks for file paths)
const {POST_POPULATE,USER_CARD,isId,isPlainFileName}=require('../utils/shape.js')
// [NEW] the people of a community are populated with name and picture only
// why: populate('members.memberId') sent every member's whole account (email, phone, password hash)
const COMMUNITY_PEOPLE=[
    {path:'manager',select:USER_CARD},
    {path:'admins',select:USER_CARD},
    {path:'members.memberId',select:USER_CARD},
    {path:'waitingList.userId',select:USER_CARD}
]
class communityController{


    constructor(){

    }
    // [NEW] GET /api/community/list: every community with what a card needs and the role of the signed in user in it
    // why: the client had no way to list communities (/users-communities only gives names)
    static async listCommunities(req,res){
        try
        {
            const {user}=req
            let communities=await Community.find().sort({createdAt:-1})
            communities=communities.map(community=>{
                let role=null
                if(community.waitingList.some(({userId})=>userId.toString()===user.id))
                    role='waiting'
                if(community.members.some(({memberId})=>memberId.toString()===user.id))
                    role='member'
                if(community.admins.some(admin=>admin.toString()===user.id))
                    role='admin'
                if(community.manager.toString()===user.id)
                    role='manager'
                return {
                    _id:community.id,
                    communityName:community.communityName,
                    describtion:community.describtion,
                    category:community.category,
                    coverImageName:community.coverImageName,
                    public:community.public,
                    postApproval:community.postApproval,
                    membersCount:community.members.length,
                    postsCount:community.posts.filter(post=>post.approved).length,
                    role
                }
            })
            return res.json({success:true,communities})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async sendCommunityPosts(req,res,next){
        try
        {
        let community=await Community.findById(req.query.communityId)
        // [FIX] an unknown id crashed on community.posts
        if(!community)
            return res.json({success:false,err:'no community was found'})
        const {user}=req
        // [FIX] the braces were missing after if(!community.public), so for EVERY community the line
        // "return res.json({success:false,err:'you are not a member'})" ran and no posts were ever sent.
        // The original lines:
        // if(!community.public)
        //     if(community.members.some(({memberId})=>memberId.toString()===user.id))
        //             return res.json({success:true,posts:community.posts})
        //     return res.json({success:false,err:'you are not a member'})
        //     if(!req.user.id)
        //     await interestsMiddleWare.updateScore(community.category,'viewCommunity',req.user)
        // return res.json({success:true,posts:community.posts})
        if(!community.public)
            if(community.members.every(({memberId})=>memberId.toString()!==user.id))
                return res.json({success:false,err:'you are not a member'})
        community.posts=community.posts.filter(post=>post.approved)
        // [CHANGED] the posts are populated with their publisher (only the ids were populated before)
        community=await community.populate({path:'posts.postId',populate:POST_POPULATE})
        // [FIX] viewCommunity is scored for every visit (it sat behind if(!req.user.id), which never ran)
        await interestsMiddleWare.updateScore(community.category,'viewCommunity',req.user)
        // [NEW] posts that were deleted are skipped, newest first
        const posts=community.posts.filter(post=>post.postId).reverse()
        return res.json({success:true,posts})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async approvePost(req,res,next){
        try
        {
            // [FIX] the post was loaded before the check that a post id was sent, and an unknown id crashed below
            if(!req.body.postId)
                return res.json({success:false,err:'no post id was sent'})
            const post=await Post.findById(req.body.postId)
            const community=await Community.findById(req.body.communityId)
            if(!post||!community)
                return res.json({success:false,err:'post or community was not found'})
            const {user}=req
            const {postId}=req.body
            
            if(user.id!==community.manager.toString()&&community.admins.every(admin=>admin.toString()!==user.id))
                return res.json({success:false,err:'you are not an admin niether the manager'})
            for (let i = 0; i < community.posts.length; i++) 
                    if(community.posts[i].postId.toString()===postId)
                        community.posts[i].approved=true  
            await community.save()
            // [CHANGED] the notification points to the community (the post itself is shown there),
            // and you get none for approving your own post
            // await Notification.create({user:post.publisher,subject:{model:'Post',action:'approvePost',id:post.id},notifier:req.user.id})
            if(post.publisher.toString()!==req.user.id)
            await Notification.create({user:post.publisher,subject:{model:'Community',action:'approvePost',id:community.id},notifier:req.user.id})                          
            return res.json({success:true,postId})
        }   
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async sendCommunityUnapprovedPosts(req,res,next){
        try
        {
        let community=await Community.findById(req.query.communityId)
        if(!community)
            return res.json({success:false,err:'no community was found'})
        const {user}=req
        // [FIX] the admin branch answered {success:success}: "success is not defined", so admins always got an error
        // if(community.admins.some(admin=>admin.toString()===user.id))
        //     return res.json({success:success,posts:community.posts})
        if(community.manager.toString()!==user.id&&community.admins.every(admin=>admin.toString()!==user.id))
            return res.json({success:false,err:'you are not the manager neither an admin'})
        community.posts=community.posts.filter(post=>!post.approved)
        // [CHANGED] populated with the publisher, and deleted posts are skipped
        community=await community.populate({path:'posts.postId',populate:POST_POPULATE})
        return res.json({success:true,posts:community.posts.filter(post=>post.postId)})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getImage(req,res,next){
        try
        {
            const {imageName}=req.params
            // [SECURITY] path traversal: only a community id and a plain file name are accepted
            // [FIX] "await !exists(imagePath)" was always false (see deleteImage), so a missing file was never reported;
            // res.sendFile answers 404 by itself
            // const imagePath=resolve(__dirname,'..','uploaded-files','communities-images',req.query.communityId||req.body.communityId,imageName)
            // if(await !exists(imagePath))
            //     return res.json({success:false,err:'file was found'})
            if(!isId(req.query.communityId)||!isPlainFileName(imageName))
                return res.status(400).json({success:false,err:'invalid image'})
            const imagePath=resolve(__dirname,'..','uploaded-files','communities-images',req.query.communityId,imageName)
            return res.sendFile(imagePath)
            }   
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async checkCommunityExists(req,res){
        try{
            if(!req.query.communityName)
            return res.json({success:false,err:'no community name was sent'})
                const community=await Community.findOne({communityName:req.query.communityName})
                // [FIX] was if(!community.id): a free name gives null, and null.id crashed
                if(!community)
                    return res.json({success:true,msg:'no community was found'})
                  return res.json({success:false,err:'this name name is taken'})  
                }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getCommunity(req,res,next){
        try{
                let community=await Community.findById(req.community.id)
                // [FIX] was if(!community._id), which crashed on null
                if(!community)
                return res.json({success:false,err:'no community was found'})
                // [SECURITY] names and pictures only (populate('admins') / populate('manager') sent whole accounts)
                community=await community.populate(COMMUNITY_PEOPLE)
                return res.json({success:true,community})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async sendCommunity(req,res,next){
        try{
            let community=await Community.findById(req.query.communityId||req.body.communityId)
            // [FIX] was if(!community._id), which crashed on null
            if(!community)
            return res.json({success:false,err:'no community was found'})
            // [SECURITY] only names and pictures of the people, not their whole accounts
            // (the waiting list is populated too, so managers can see who asked to join)
            community=await community.populate(COMMUNITY_PEOPLE)
            return res.json({success:true,community})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async sendCommunityCoverImageName(req,res,next){
        try{
            let {community}=req
            let coverImageName=community.coverImageName
            if(!coverImageName)
            return res.json({success:false,err:'no image name was found was found'})
            return res.json({success:true,coverImageName})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async deleteCommunity(req,res){
        try
        {
            // [CHANGED] the id of the community verifyCommunityManager checked, not the raw query
            const community=await Community.findByIdAndDelete(req.community.id)
            await interestsMiddleWare.updateScore(community.category,'deleteCommunity',req.user)
            return res.json({success:true,community})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=communityController
