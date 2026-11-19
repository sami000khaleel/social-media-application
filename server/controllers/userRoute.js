const mongoose = require('mongoose')
const fs=require('fs')
const util=require('util')
const {join}=require('path')
const readFile=util.promisify(fs.readFile)
const User = require('../models/userSchema.js');
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken');
// const { userInfo } = require('os')   // [CHANGED] unused import
// [FIX] Notification was used in patchUser but never imported ("Notification is not defined" after every save)
const Notification=require('../models/notificationSchema.js')
// [NEW] helpers: publicProfile hides private fields, isId / isPlainFileName check values used in file paths
const {publicProfile,isId,isPlainFileName}=require('../utils/shape.js')
// [NEW] sends uploaded files; draws a missing demo picture again (see utils/sendUpload.js)
const sendUpload=require('../utils/sendUpload.js')
require('dotenv').config()
// [SECURITY] the only fields a user may change through PATCH /api/user
const EDITABLE_FIELDS=['firstName','lastName','middleName','age','job','email','phoneNumber']
class user{
  constructor(){

  }
  static async patchUser(req,res){
    try{
      let {user}=req
      // [SECURITY] only whitelisted fields are copied. Before, any field could be overwritten,
      // even password, interests or followers.
      // const objectFileds=Object.keys(req.body)
      const objectFileds=Object.keys(req.body).filter(field=>EDITABLE_FIELDS.includes(field))
      for (let i = 0; i < objectFileds.length; i++)
      if(req.body[objectFileds[i]]==='')
        return res.json({success:false,err:'you connot send empty fields'})
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 0; i < objectFileds.length; i++) 
       if(objectFileds[i]==='email')   
        {
          if(!emailRegex.test(req.body.email))
            return res.json({success:false,err:'invalid email'})
          // [CHANGED] emails are saved in lower case, like at sign up
          req.body.email=String(req.body.email).trim().toLowerCase()
          let otherUser=await User.find({email:req.body.email})
          // [FIX] saving your own unchanged email answered "another user is using this email"
          // if(otherUser.length)
          if(otherUser.some(other=>other.id!==user.id))
            return res.json({success:false,err:'another user is using this email'})
        }

          objectFileds.forEach(field=>user[field]=req.body[field])
          // [NEW] address and education are objects, so only their known keys are copied
          if(req.body.address&&typeof req.body.address==='object')
            ['country','city','street'].forEach(key=>{
              if(typeof req.body.address[key]==='string')
                user.address[key]=req.body.address[key]
            })
          if(req.body.education&&typeof req.body.education==='object')
            ['educationLevel','educationPlace'].forEach(key=>{
              if(typeof req.body.education[key]==='string')
                user.education[key]=req.body.education[key]
            })
        await user.save()
        await Notification.create({user:req.user.id,subject:{model:'User',action:'updatePorfile',id:req.user.id}})
          return res.json({success:true,user})
  }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async getUsers(req,res){
    try{
      const {usersIds}=  req.query
      if(!usersIds.length)
      return res.json({success:true,users:[]})
    let users=[]
      for (let i = 0; i < usersIds.length; i++) 
        {
          // [SECURITY] only the public part of each profile, and [FIX] ids of deleted users are skipped
          // users.push(await User.findById(usersIds[i]))
          const user=await User.findById(usersIds[i])
          if(user)
          users.push(publicProfile(user))
        }
      
    return res.json({success:true,users})
  }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async getFollowes(req,res){
    try{

      const {userId}=req.query
      let followes=[]
      let user=await User.findById(userId)
      for (let i = 0; i < user.followes.length; i++) {
        let follow=await User.findById(user.followes[i])
        // [FIX] a followed account can be deleted; follow.profileImage crashed on null
        if(follow)
        followes.push({profileImage:follow.profileImage,firstName:follow.firstName,lastName:follow.lastName,_id:follow.id})
      }
      return res.json({success:true,followes})
    }
      catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
      }
          
  }
  static async getFollowers(req,res){
    try{

      const {userId}=req.query
      let followers=[]
      let user=await User.findById(userId)
      for (let i = 0; i < user.followers.length; i++) {
        let follower=await User.findById(user.followers[i])
        // [FIX] a follower can be deleted; follower.profileImage crashed on null
        if(follower)
        followers.push({profileImage:follower.profileImage,firstName:follower.firstName,lastName:follower.lastName,_id:follower.id})
      }
      return res.json({success:true,followers})
    }
      catch(err){
        console.log(err)
        return res.json({success:false,err:err.message})
      }
          
  }
  static async deleteUser(req,res,next){
    try
    {
      // [SECURITY] deletes the signed in account. Before, the id came from the query, so anyone could delete any account.
      // let user=await User.findByIdAndDelete(req.query.userId)
      let user=await User.findByIdAndDelete(req.user.id)
      return res.json({success:true,msg:'you account has been deleted'})
    }
    catch(err)
    {
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async getCoverImage(req,res,next){
    try
    {
      // [SECURITY] path traversal: imageName "../../../.env" could read any file of the server
      if(!isId(req.query.userId)||!isPlainFileName(req.params.imageName))
      return res.status(400).json({success:false,err:'invalid image'})
      const path=join(__dirname,'..','uploaded-files','users-images',req.query.userId,`user-cover-image`,req.params.imageName)
      // [CHANGED] a missing demo picture is drawn again from its name instead of failing with ENOENT
      // return res.sendFile(path)
      return sendUpload(res,path)
    }
    catch(err)
    {
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async getProfileImage(req,res,next){
    try
    {
      // [SECURITY] path traversal, same check as getCoverImage
      if(!isId(req.query.userId)||!isPlainFileName(req.params.imageName))
      return res.status(400).json({success:false,err:'invalid image'})
      const path=join(__dirname,'..','uploaded-files','users-images',req.query.userId,`user-profile-image`,req.params.imageName)
      // [CHANGED] a missing demo picture is drawn again from its name instead of failing with ENOENT
      // return res.sendFile(path)
      return sendUpload(res,path)
    }
    catch(err)
    {
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  // log in user
  static async sendFollow(req,res,next){
    try{
      const {friend}=req
      // [CHANGED] following:true tells the client the new state (checkIfFollowes answers following:false on unfollow)
      // [SECURITY] publicProfile: the whole user document, email and phone included, was sent
      return res.json({success:true,following:true,followes:publicProfile(friend)})
    }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async generateToken(req,res,next){
   try{
    const token= await jwt.sign({id:req.user.id,},process.env.JWT_SECRET,{expiresIn:'2w'})
    // [FIX] typo "sucess" -> "success" (the client checks success)
    return res.status(200).json({success:true,token:token,userId:req.user.id})
  }
catch(err){
  console.log(err.message)
  return res.status(400).json({success:false,err:err.message})
}
}


  //send user and token
  // req.user req.token
  static async getUser(req,res){
    try{
        const {userId}=req.params
        // [CHANGED] the block routes end here without a user id and get the signed in user back
        if(!userId&&req.user)
        return res.json({success:true,user:req.user})
        let user=await User.findById(userId)
        // [FIX] for an unknown id this route answered with req.user, which is undefined on this public route
        // user=req.user
        if(!user)
        return res.json({success:false,err:'no user was found'})
        // [SECURITY] other people only get the public part of a profile (no email, phone, interests, hash)
        // res.json({success:true,user:user})
        res.json({success:true,user:publicProfile(user)})
      }
    catch(err){
      console.log(err.message)
      res.json({success:false,err:err.message})
    }
  }
  static async sendUser(req,res){
    try{
      
    return  res.status(201).json({success:true,token:req.token,user:req.user})
    }
    catch(err){
      console.log(err)
return      res.status(400).json({success:false,err:err.message})   // [FIX] typo "sucess"
    }
  }
  static async sendImage(req,res,next){
    try{
      const {image}=req
      return res.json({success:true,image})
    }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
}
  
module.exports=user
