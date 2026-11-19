const User= require('../models/userSchema.js')
const fs=require('fs')
const util=require('util')
const Notification=require('../models/notificationSchema.js')
const bcrypt = require('bcrypt');
const mkdir=util.promisify(fs.mkdir)
const readdir=util.promisify(fs.readdir)
const unlink=util.promisify(fs.unlink)
const readFile=util.promisify(fs.readFile)
const writeFile=util.promisify(fs.writeFile)
const access=util.promisify(fs.access)
// [NEW] safeFileName cleans upload names, publicProfile hides private fields of a user
const {safeFileName,publicProfile}=require('../utils/shape.js')
async function checkUserBlock(req,res,userId){
    try
    {
        let {user}=req
        if(user.blockedUsers.length)
        // [FIX] typo: is.toString() -> id.toString() ("is is not defined" for anyone with a blocked user)
        if(user.blockedUsers.some(id=>id.toString()===userId.toString()))
            return true
            return false
    }
    catch(err){
        return res.json({success:false,err:err.message})
    }
}
// check if users exists
// async function getUsers(res,usersId){
//     let users=[]
//     usersId.forEach(async (id)=>{
//         let user=await User.findById(id)
//         if(!user)
//         return res.json({success:false,err:'user was not found'})
//         users.push(user)
//     })
//     return users
// }

// input is image file and saved dir
// first checks if dir exists
// if it does not exists then this is the first time
// and should create his dir
// if it does then delete old images
// save new image with unique name and return name 
async function saveUserImage(imageFile,dir){
    try{
        let imagesNames=[]
       let a = fs.existsSync(dir)
        if(!fs.existsSync(dir))
        await mkdir(dir,{recursive:true})
       
        if(fs.existsSync(dir))
        {

        imagesNames= await readdir(dir)
        if(imagesNames.length)
        imagesNames.forEach(async(imageName)=>await unlink(`${dir}/${imageName}`))
    }
        const random=await require('crypto').randomBytes(8).toString('hex')
        // [SECURITY] the original name could contain "../" and write outside the upload folder
        // const filePath=`${dir}/${random}-${imageFile.originalname}`
        const imageName=`${random}-${safeFileName(imageFile.originalname)}`
        const filePath=`${dir}/${imageName}`
        await writeFile(filePath,imageFile.buffer,{recursive:true})
        return imageName
    }
    catch(err){
        console.log(err)
        
    }
    }
class userMiddleware{
    constructor(){


    }
    static async checkCommunityBlock(req,res,next){
        try
        {
            let {user,community}=req
            if(user.blockedCommunities.some(id=>id.toString()===community.id))
            return res.json({success:false,err:'you  blocked this community'})
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getBlockedUser(req,res,next){
        try
        {
            console.log('das')
            let blockedUser=await User.findById(req.query.blockedUserId||req.body.blockedUserId)
            req.blockedUser=blockedUser
            return next()

        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async verifyJoinerNoRole(req,res,next){
        try
        {
            let {joiner,community}=req
            
            if(joiner.adminedCommunities.some(cid=>cid.toString()===community.id))
            return res.json({success:false,err:'you are an admin'})
            if(joiner.managedCommunities.some(cid=>cid.toString()===community.id))
            return res.json({success:false,err:'you are the manager'})
            return next()

        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getJoiner(req,res,next){
        try
        {
            let joiner=await User.findById(req.query.joinerId||req.body.joinerId)
            if(!joiner)
            return res.json({success:false,err:'no joiner was found'})
            req.joiner=joiner
            return next()
            }
            catch(err){
          console.log(err)
          return res.json({success:false,err:err.message})
        }
      }
    static async findUser(req,res,next){
        try
        {
            const user=await User.findById(req.body.userId||req.query.userId)
            if(!user)
            return res.json({success:false,err:'no user was found'})
            req.user=user
            return next()
        }
        catch(err){
          console.log(err)
          return res.json({success:false,err:err.message})
        }
      }
    static async checkManagerNotAdmin(req,res,next){
        try
        {
            let {user}=req
            let {adminsId}=req.body
            if(adminsId.some(id=>id.toString()===user.id))
                return res.json({success:false,err:'you cant do both roles'})
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getNewManager(req,res,next){
        try
        {
        let newManager=await User.findById(req.body.newManagerId)
        if(!newManager)
        return res.json({success:false,err:'new manager does not exists'})
        if(newManager.id===req.user.id)
        return res.json({success:false,err:'can not send the same old manager'})
        req.newManager=newManager
        return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async createUser(req,res,next){
        // [CHANGED] job can be sent at sign up
        try{ const {firstName,lastName,middleName,birthDate,city,country,age,phoneNumber,sex,street,email,password,job}= req.body
          // [NEW] checks before saving: required fields, a valid email and a password of 8+ characters
          // why: an empty password crashed bcrypt, and a missing name gave a raw mongoose error
          if(!firstName||!lastName||!email||!password||!age)
          return res.status(400).json({success:false,err:'first name, last name, age, email and password are required'})
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          return res.status(400).json({success:false,err:'invalid email'})
          if(String(password).length<8)
          return res.status(400).json({success:false,err:'the password needs at least 8 characters'})
          const hashedPassword=await bcrypt.hash(password,10)
          // [FIX] every interest starts its history with {score:0,date:now}
          // why: the old keys were spelled "socre" (so no score was saved) and most topics
          // (technology, health, travel, ...) do not exist in userSchema.interests, which only has these five
          const start=()=>[{score:0,date:new Date()}]
        const user =await User.create({
          password:hashedPassword,  
          firstName,
              lastName,
              middleName,
              birthDate,
              age,
             address:{
                      country,
                      city,
                      street
             },
              phoneNumber,
              sex,
              email,
              job,   // [CHANGED] saved at sign up
              // interests:{
              //   business:[{socre:0}]
              //   ,scienceAndEnviroment:[{socre:0}]
              //   ,technology:[{socre:0}]
              //   ,health:[{socre:0}]
              //   ,travel:[{socre:0}],
              //   entertainmentAndArts:[{socre:0}]
              //   ,sport:[{socre:0}],
              //   basketBall:[{socre:0}],
              //   football:[{socre:0}],
              //   tennis:[{socre:0}],
              //   fashion:[{socre:0}],
              //   news:[{socre:0}],
              //   food:[{socre:0}],
              //   music:[{socre:0}],
              //   car:[{socre:0}],
              //   politics:[{socre:0}],
              // }
              interests:{
                business:start(),
                tech:start(),
                entertainment:start(),
                sport:start(),
                politics:start()
              }
          })
          req.user=user
        
          await user.save()
          return next()
        }
      
      catch(err){
      res.status(400).json({success:false,err:err.message})
      }
      }
    static async getAdmins(req,res,next){
        try{
            console.log('got the admins')
            let admins=[]
            let {community}=req
            // [CHANGED] also read from the query (DELETE requests usually send no body)
            const adminsId=req.body.adminsId||req.query.adminsId
            if(adminsId)
            if(adminsId.length)
            for (let i = 0; i < adminsId.length; i++) {
                let user=await User.findById(adminsId[i])
                if(!user)
                return res.json({success:false,err:'no user was found'})
                admins.push(user)
            }
            req.admins=admins
            return next()
            
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
      static async checkAdmins(req,res,next){
        try{
            
            let {admins}=req
            if(!admins.length)
            return res.json({success:false,err:'no admins were sent'})
            const {community}=req
            // [CHANGED] removed "if(!community.admins.length) return next()" and the "continue" for users without
            // adminedCommunities: they skipped the checks below for the first admin of a community
            for (let i = 0; i < admins.length; i++) {
            // [NEW] the manager can not be an admin too, and an admin must already be a member
            if(community.manager.toString()===admins[i].id)
                return res.json({success:false,err:'the manager can not be an admin too'})
            if(community.members.every(({memberId})=>memberId.toString()!==admins[i].id))
                return res.json({success:false,err:'an admin must be a member first'})
            if(community.admins.some(adminId=>adminId.toString()===admins[i].id)||admins[i].adminedCommunities.some(commId=>commId.toString()===community.id))
                return res.json({success:false,err:'found an existing admin try again with the same list'})
                      }
            // [FIX] next() used to sit inside the loop: only the first admin was checked,
            // and a request with no match ended without any answer
            return next()
                                  }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
      }
      static async destructUser(req,res,next){
        try
        {
           let {user}=req
           // get posts            
           user= await user.populate('posts')
           req.postsList=[... user.posts]
           // get likded posts
           user=await user.populate('postsLiked')
           req.postsLikedList=[... user.postsLiked]
           // get comments
           user=await user.populate('comments')
           req.commentsList=[... user.comments]
           
           // get comments liked
           user=await user.populate('commentsLiked')
           req.commentsLikedList=user.commentsLiked
           return next() 
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async checkIfFollowes(req,res,next){
        try
        {
         const {user,addedUser}=req
         if(user.id===addedUser.id)
         return res.json({success:false,err:'you can not follow your self'})
         let response= await checkUserBlock(req,res,addedUser.id,user.id)
         if(response)
         return res.json({success:false,err:'user is blocked by you'})
         if(user.followes.every(friendId=>addedUser.id!==friendId.toString()))
         return next()
           user.followes= user.followes.filter(friendId=>friendId.toString()!==addedUser.id)
           await user.save()
           addedUser.followers=addedUser.followers.filter(friendId=>friendId.toString()!==user.id)
           await addedUser.save()
           // [CHANGED] following:false tells the client the user was unfollowed
           // [SECURITY] publicProfile instead of the whole user document (email, phone, password hash)
           return res.json({success:true,following:false,followes:publicProfile(addedUser)})
            
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async getUser(req,res,next){
        try
        {
            let user=await User.findById(req.query.userId||req.body.userId)
            // [FIX] an unknown id crashed in checkIfFollowes (addedUser.id of null)
            if(!user)
            return res.json({success:false,err:'no user was found'})
            req.addedUser=user
            return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    } 
   
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
        static async updateCoverImage(req,res,next){
            try
        {
            // [NEW] checks that a file was sent and that it is a picture
            if(!req.files||!req.files[0])
            return res.json({success:false,err:'no image was sent'})
            const coverImage=req.files[0]
            if(!String(coverImage.mimetype).startsWith('image/'))
            return res.json({success:false,err:'the file is not an image'})
            let {style}=req.body
            // [FIX] JSON.parse(undefined) crashed when no style was sent
            style=style?JSON.parse(style):{}
            const profileDir=`./uploaded-files/users-images/${req.user.id}/user-cover-image`
            const imageName= await saveUserImage(coverImage,profileDir)
            const image={imageName,style}
                req.image=image
                req.imageType='cover'
                return next()

        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    static async updateProfileImage(req,res,next){
        try
        {
            // [NEW] checks that a file was sent and that it is a picture
            if(!req.files||!req.files[0])
            return res.json({success:false,err:'no image was sent'})
            const profileImage=req.files[0]
            if(!String(profileImage.mimetype).startsWith('image/'))
            return res.json({success:false,err:'the file is not an image'})
            let {style}=req.body
            // [FIX] JSON.parse(undefined) crashed when no style was sent
            style=style?JSON.parse(style):{}
            const profileDir=`./uploaded-files/users-images/${req.user.id}/user-profile-image`          
            const imageName= await saveUserImage(profileImage,profileDir)
            const image={imageName,style}
                req.image=image
                req.imageType='profile'
                return next()
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }

    static async saveUserImage(req,res,next){
        try
        {
            let {user}=req
            if(req.imageType==='profile')
            user.profileImage=req.image
            if(req.imageType==='cover')
            user.coverImage=req.image
            await user.save()
            return next()

        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
}

module.exports=userMiddleware
