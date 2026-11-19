const express = require('express')
const User=require('../models/userSchema.js')
const Community=require('../models/communitySchema.js')
const auth=require('../middleware/authentication.js')
const userController=require('../controllers/userRoute')
const postController=require('../controllers/postsRoute.js')
// [CHANGED] unused imports commented out (axios was only used by the AI routes below)
// const communitySchema = require('../models/communitySchema.js')
// const Notification=require('../controllers/notificationRoute.js')
// const axios = require('axios');
const interestsMiddleWare = require('../middleware/interestsMiddleware.js')
const router=express.Router()
// [AI OFF] this route asked the Python AI server (port 5000) to classify a dialog. Kept, commented out.
// router.get('/classify-dialog',auth.verifyToken,async(req,res)=>{
//     try{
//
//         const {data}=await axios.get(`http://127.0.0.1:5000/api/ai/dialog?dialog=${req.query.dialog}`)
//         console.log(data)
//         return res.json({success:true,classification:data})
//     }
//     catch(err){
//         console.log(err)
//         return res.json({success:false,err:err.message})
//     }
// })

// will get posts after the latest post user has got
// if user is fresh then send latest posts
// calcInterests works out how the page is split between the interests (req.derivatives)
// sendPosts picks the posts
router.get('/get-posts',auth.verifyToken,interestsMiddleWare.calcInterests,postController.sendPosts)
// [NEW] the "How my feed works" page: the mix now, the score history and every page of the feed that was sent
const insightsController=require('../controllers/insightsRoute.js')
router.get('/insights',auth.verifyToken,insightsController.insights)
// [NEW] 3 posts of one topic for the "Try it" box on that page
router.get('/insights/try',auth.verifyToken,insightsController.tryPosts)
// [NEW] only the mix right now, without sending posts (the home page refreshes it after a reaction)
router.get('/feed-mix',auth.verifyToken,interestsMiddleWare.calcInterests,insightsController.feedMix)
router.get('/get-users',auth.verifyToken,userController.getUsers)
router.get('/post-file/:fileName',postController.getFile)
router.get('/user-cover-image/:imageName',userController.getCoverImage)
router.get('/user-profile-image/:imageName',userController.getProfileImage)
router.get('/users-communities',async(req,res)=>{
    try{
    let users=await User.find()
    // [NEW] the private copies of demo visitors are not listed (they would show up as twins)
    users=users.filter(user=>!user.demoCloneOf)
    users=users.map(user=>{
        return{

            firstName:user.firstName,
            lastName:user.lastName,
            id:user.id,
            // [NEW] the job is shown under the name in "people to follow"
            job:user.job,
            profileImage:user.profileImage
        }
    })
        let communities=await Community.find()
        communities= communities.map(community=>{
        return {
        _id:community.id,
        communityName:community.communityName}
    })
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
    // [FIX] the search ignores upper and lower case and also matches "first last"
    // why: searching "lena" did not find "Lena", and "lena hoff" found nobody
    searchQuery=String(searchQuery).trim().toLowerCase()
    let results={
        users:[],
        communities:[]
    }
    let users=await User.find()
    users=users.filter(user=>{
        // [NEW] the private copies of demo visitors are not listed
        if(user.demoCloneOf)
            return false
        // if(user.firstName.includes(searchQuery))
        //     return true
        //     if(user.lastName.includes(searchQuery))
        //     return true
        const fullName=`${user.firstName} ${user.lastName}`.toLowerCase()
        if(fullName.includes(searchQuery))
            return true
    })
    users=users.map(user=>{
        return ({
            firstName:user.firstName,
            lastName:user.lastName,
            imageName:user.profileImage.imageName,
            // [NEW] the whole picture object and the job, so a result row looks like every other person row
            profileImage:user.profileImage,
            job:user.job,
            id:user.id
            
        })
    })
    results.users=[... users]
    // find communities
    let communities=await Community.find()
    communities=communities.filter(community=>{
        if(community.communityName.toLowerCase().includes(searchQuery))
            return true
    })
    // [NEW] topic, cover, public flag and member count, so a result shows more than the name
    communities=communities.map(community=>({communityName:community.communityName,_id:community.id,category:community.category,coverImageName:community.coverImageName,public:community.public,membersCount:community.members.length}))
    results.communities=[... communities]
    return res.json({success:true,results})
}
catch(err){
    console.log(err)
    // [FIX] was "return err.message", which never answered the request (the browser waited forever)
    return res.json({success:false,err:err.message})
}
} )
router.get('/followers',auth.verifyToken,userController.getFollowers)
router.get('/followes',auth.verifyToken,userController.getFollowes)
// [AI OFF] this route sent chat messages to the Python AI server to find a topic. Kept, commented out.
// router.post('/classify-text',auth.verifyToken,async (req,res)=>{
//     try{
//    const category= await axios.get(`http://127.0.0.1:5000/api/ai/messages`,{messages:req.body.messages})
//    await interestsMiddleWare.updateScore(category,'messages',req.user)
//    return res.json({success:true})
//     }
//     catch(err){
//         console.log(err)
//         return res.json({success:false,err:err.message})
//     }
// })
module.exports=router
