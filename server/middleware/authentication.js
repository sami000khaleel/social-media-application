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
            console.log(req.body.communityId)
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
        const user=await User.findOne({email:req.body.email})
        if(!user)
        return next()
        res.status(400).json({sucess:false,err:'this email is already in use'})
        }
        catch(err){
            console.log(err.message)
            res.status(400).json({success:false,err:err.message})
        }
        }
    static async verifyToken(req,res,next){
        try{
            const bearer =req.headers['authorization']
            const token=bearer.split(' ')[1]
            if(!token)
            res.status(400).json({success:false,err:'you are not signed in'})
            const data=await jwt.verify(token,process.env.JWT_SECRET)
            req.userId=data.userId
            let user=await User.findById(data.userId)
            req.user=user
            console.log(req.user)
            return next()
        }
        catch(err){
            // console.log(err)
            res.status(400).json({success:false,err:err.message})
        }
    }
    static async generateToken(req,res,next){
        try{
            const token=jwt.sign({userId:req.user.id},process.env.JWT_SECRET)
            req.token=token
            return next()
        }
        catch(err){
            console.log(err.message)
            res.status(400).json({sucess:false,err:err.message})
        }
    }
    // req.body.email req.body.password 
    // returns req.user
    static async verifyUser(req,res,next){
        try{
            const user=await User.findOne({email:req.query.email})
            if(!user){
               return res.status(404).json({success:false,err:'email does not exist'})
            
        }
        const password=req.headers['password']
    
        const boolRes=await bcrypt.compare(password,user.password)
            if(!boolRes)
            return res.status(400).json({sucess:false,err:'the password is wrong'})
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