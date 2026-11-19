const jwt=require('jsonwebtoken')
const User=require('../models/userSchema.js')
const Community=require('../models/communitySchema.js')
const bcrypt = require('bcrypt');
class authentication{
    constructor(){

    }
    static async verifyCommunityRole(req,res,next){
        try
        {
            let community=await Community.findById(req.body.communityId||req.query.communityId)
            if(!community)
            return res.json({success:false,err:'no comunity was found'})
            const {user}=req
           req.community=community
            if(req.headers['community-role']==='admin')
            {
                    if(user.adminedCommunities.every(id=>id.toString()!==community.id))
                        return res.json({success:false,err:'you are not an admin'})
                        return next()
                    }
                if(req.headers['community-role']==='manager'){
                    if(user.managedCommunities.every(id=>id.toString()!==community.id))
                        return res.json({success:false,err:'you are not the manager'})
                        return next()
                }
                return res.json({success:false,err:'no community role was specified'})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async verifyCommunityAdmin(req,res,next){
        try{
            let {user}=req
            const community=await Community.findById(req.query.communityId||req.body.communityId)
            // [FIX] an unknown id crashed on community.id below
            if(!community)
            return res.json({success:false,err:'no community was found'})
            req.community=community
            if(user.adminedCommunities.every(commId=>commId.toString()!==community.id))
            return res.json({success:false,err:'you are not the admin'})
            for (let i = 0; i < community.admins.length; i++)
                if(community.admins[i].toString()===user.id)
                return next() 
            return res.json({success:false,err:'you are not the admin'})                        
            }

        
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async verifyCommunityManager(req,res,next){
        try{
            const community=await Community.findById(req.body.communityId||req.query.communityId)
            if(!community)
            return res.json({success:false,err:'no commnity was found'})
            const {user}=req
            if(user.managedCommunities.every(id=>id.toString()!==community.id))
                return res.json({success:false,err:'you are not the manager'})
                if(community.manager.toString()!==user.id)
                return res.json({success:false,err:'you are not the manager'})
            req.community=community
            return next()    
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    static async checkEmailExists(req,res,next){
        try{
        // [NEW] email is required, and saved in lower case so "Lena@x.com" and "lena@x.com" are the same account
        if(!req.body.email)
        return res.status(400).json({success:false,err:'email is required'})
        req.body.email=String(req.body.email).trim().toLowerCase()
        const user=await User.findOne({email:req.body.email})
        if(!user)
        return next()
        res.status(400).json({success:false,err:'this email is already in use'})   // [FIX] typo "sucess"
        }
        catch(err){
            console.log(err.message)
            res.status(400).json({success:false,err:err.message})
        }
        }
    static async verifyToken(req,res,next){
        try{
            const bearer =req.headers['authorization']
            // [FIX] without the header, bearer.split crashed ("Cannot read properties of undefined")
            // [CHANGED] 401 instead of 400 for "not signed in", so the client knows to show the sign in page
            if(!bearer)
            return res.status(401).json({success:false,err:'you are not signed in'})
            const token=bearer.split(' ')[1]
            // [FIX] "return" was missing: the error was sent and the request still went on to the route
            if(!token)
            return res.status(401).json({success:false,err:'you are not signed in'})
            const data=await jwt.verify(token,process.env.JWT_SECRET)
            let user=await User.findById(data.userId)
            // [FIX] a token of a deleted account gave req.user=null and crashed every route after it
            if(!user)
            return res.status(401).json({success:false,err:'this account does not exist any more'})
            req.userId=data.userId
            req.user=user
            return next()
        }
        catch(err){
            // [CHANGED] a wrong or expired token answers 401
            // [CHANGED] console.log(req.user) removed above: it printed every user, with the password hash, on every request
            res.status(401).json({success:false,err:err.message})
        }
    }
    static async generateToken(req,res,next){
        try{
            // [SECURITY] tokens expire after 14 days (they never expired before)
            // const token=jwt.sign({userId:req.user.id},process.env.JWT_SECRET)
            const token=jwt.sign({userId:req.user.id},process.env.JWT_SECRET,{expiresIn:'14d'})
            req.token=token
            return next()
        }
        catch(err){
            console.log(err.message)
            res.status(400).json({success:false,err:err.message})   // [FIX] typo "sucess"
        }
    }
    // [CHANGED] reads the login from two places:
    // req.body.email req.body.password req.body.password  (POST /login)
    // or req.query.email and the password header (the old GET /login)
    // returns req.user
    static async verifyUser(req,res,next){
        try{
            // const user=await User.findOne({email:req.query.email})
            // const password=req.headers['password']
            const email=req.body.email||req.query.email
            const password=req.body.password||req.headers['password']
            if(!email||!password)
               return res.status(400).json({success:false,err:'email and password are required'})
            // [CHANGED] finds the email as typed or in lower case (new accounts are saved in lower case,
            // accounts created before this change keep their old spelling)
            const user=await User.findOne({email:{$in:[String(email).trim(),String(email).trim().toLowerCase()]}})
            if(!user){
               return res.status(404).json({success:false,err:'email does not exist'})
            
        }
    
        const boolRes=await bcrypt.compare(password,user.password)
            if(!boolRes)
            return res.status(400).json({success:false,err:'the password is wrong'})   // [FIX] typo "sucess"
            req.user=user
            return next()
        }
        catch(err){
            console.log(err.message)
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=authentication
