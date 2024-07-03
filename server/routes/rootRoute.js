const express = require('express')
const User=require('../models/userSchema.js')
const Community=require('../models/communitySchema.js')
const auth=require('../middleware/authentication.js')
const userController=require('../controllers/userRoute')
const postController=require('../controllers/postsRoute.js')
const communitySchema = require('../models/communitySchema.js')
const Notification=require('../controllers/notificationRoute.js')
const axios = require('axios');
const interestsMiddleWare = require('../middleware/interestsMiddleware.js')
const router=express.Router()
// will get posts after the latest post user has got 
// if user is fresh then send latest posts
router.get('/classify-dialog',auth.verifyToken,async(req,res)=>{
    try{

        const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/dialog?dialog=${req.query.dialog}`)
        console.log(data)
        return res.json({success:true,classification:data})
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
})
router.get('/get-posts',auth.verifyToken,interestsMiddleWare.calcInterests,postController.sendPosts)
router.get('/get-users',auth.verifyToken,userController.getUsers)
router.get('/post-file/:fileName',postController.getFile)
router.get('/user-cover-image/:imageName',userController.getCoverImage)
router.get('/user-profile-image/:imageName',userController.getProfileImage)
router.get('/users-communities',async(req,res)=>{
    try{
    let users=await User.find()
    users=users.map(user=>{
        return{

            firstName:user.firstName,
            lastName:user.lastName,
            id:user.id,
            profileImage:user.profileImage
        }
    })
        let communities=await Community.find()
        communities= communities.map(community=>{
        return {
        _id:community.id,
        communityName:community.communityName}
    })
    console.log(communities)
    return res.json({success:true,communities,users})
    }
    catch(err)
{
    console.log(err)
    return res.json({success:false,err:err.message})
}
})
router.get('/search',async(req,res)=>{
try
{
    let {searchQuery}=req.query
    if(!searchQuery)
    return res.json({success:false,err:'no query was send'})
    let results={
        users:[],
        communities:[]
    }
    let users=await User.find()
    users=users.filter(user=>{
        if(user.firstName.includes(searchQuery))
            return true
            if(user.lastName.includes(searchQuery))
            return true

    })
    users=users.map(user=>{
        return ({
            firstName:user.firstName,
            lastName:user.lastName,
            imageName:user.profileImage.imageName,
            id:user.id
            
        })
    })
    results.users=[... users]
    // find communities
    let communities=await Community.find()
    communities=communities.filter(community=>{
        if(community.communityName.includes(searchQuery))
            return true
    })
    console.log(communities)
    communities=communities.map(community=>({communityName:community.communityName,_id:community.id}))
    results.communities=[... communities]
    console.log(results)
    return res.json({success:true,results})
}
catch(err){
    console.log(err)
    return err.message
}
} )
router.get('/followers',auth.verifyToken,userController.getFollowers)
router.get('/followes',auth.verifyToken,userController.getFollowes)
router.post('/classify-text',auth.verifyToken,async (req,res)=>{
    try{
   const category= await axios.get(`http://127.0.0.1:5000/api/ai/messages`,{messages:req.body.messages})
   await interestsMiddleWare.updateScore(category,'messages',req.user)
   return res.json({success:true})
    }
    catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
    }
})
module.exports=router