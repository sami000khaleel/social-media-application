const fs=require('fs')
const {promisify}=require('util')
const {resolve}=require('path')
const exists=promisify(fs.exists)
const Post=require('../models/postSchema.js')
const unlink=promisify(fs.unlink)
const Notification=require('../models/notificationSchema.js')
const Community = require('../models/communitySchema.js');
const interestsMiddleWare = require('../middleware/interestsMiddleware.js')
class communityController{


    constructor(){

    }
    static async sendCommunityPosts(req,res,next){
        try
        {
        let community=await Community.findById(req.query.communityId)
        const {user}=req
        community.posts=community.posts.filter(post=>post.approved)
        community=await community.populate('posts.postId')    


        if(!community.public)
            
                if(community.members.some(({memberId})=>memberId.toString()===user.id))
                        return res.json({success:true,posts:community.posts})                                                                                        
                return res.json({success:false,err:'you are not a member'})
                if(!req.user.id)
                await interestsMiddleWare.updateScore(community.category,'viewCommunity',req.user)   
        return res.json({success:true,posts:community.posts})    
        }   
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async approvePost(req,res,next){
        try
        {
            const post=await Post.findById(req.body.postId)
            if(!req.body.postId)
                return res.json({success:false,err:'no post id was sent'})
            const community=await Community.findById(req.body.communityId)
            const {user}=req
            const {postId}=req.body
            
            if(user.id!==community.manager.toString()&&community.admins.every(admin=>admin.toString()!==user.id))
                return res.json({success:false,err:'you are not an admin niether the manager'})
            for (let i = 0; i < community.posts.length; i++) 
                    if(community.posts[i].postId.toString()===postId)
                        community.posts[i].approved=true  
            await community.save()
            await Notification.create({user:post.publisher,subject:{model:'Post',action:'approvePost',id:post.id},notifier:req.user.id})                          
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
        const {user}=req
        community.posts=community.posts.filter(post=>!post.approved)
        community=await community.populate('posts.postId')    


            
                if(community.admins.some(admin=>admin.toString()===user.id))
                    return res.json({success:success,posts:community.posts})
                if(community.manager.toString()===user.id)                                                                                                               
                    return res.json({success:true,posts:community.posts})
                return res.json({success:false,err:'you are not the manager neither an admin'})
        }   
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getImage(req,res,next){
        try
        {
            console.log('asdsad')
            const {imageName}=req.params
            const imagePath=resolve(__dirname,'..','uploaded-files','communities-images',req.query.communityId||req.body.communityId,imageName)
            if(await !exists(imagePath))
                return res.json({success:false,err:'file was found'})
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
                if(!community.id)
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
                if(!community._id)
                return res.json({success:false,err:'no community was found'})
                if(community.admins.length)
                    community=await community.populate('admins')
                community=await community.populate('manager')
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
            if(!community._id)
            return res.json({success:false,err:'no community was found'})
            if(community.admins.length)
                community=await community.populate('admins')
           
                community=await community.populate('manager')
            if(community.members.length)
            community=await community.populate('members.memberId')
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
            const community=await Community.findByIdAndDelete(req.query.communityId)
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