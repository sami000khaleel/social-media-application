const mongoose = require('mongoose')
const fs=require('fs')
const util=require('util')
const {join}=require('path')
const readFile=util.promisify(fs.readFile)
const User = require('../models/userSchema.js');
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken');
const { userInfo } = require('os')
require('dotenv').config()
class user{
  constructor(){

  }
  static async patchUser(req,res){
    try{
      let {user}=req
      const objectFileds=Object.keys(req.body)
      for (let i = 0; i < objectFileds.length; i++)
      if(req.body[objectFileds[i]]==='')
        return res.json({success:false,err:'you connot send empty fields'})
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 0; i < objectFileds.length; i++) 
       if(objectFileds[i]==='email')   
        {
          if(!emailRegex.test(req.body.email))
            return res.json({success:false,err:'invalid email'})
          let otherUser=await User.find({email:req.body.email})
          if(otherUser.length)
            return res.json({success:false,err:'another user is using this email'})
        }

          objectFileds.forEach(field=>user[field]=req.body[field])
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
        users.push(await User.findById(usersIds[i]))        
      
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
      let user=await User.findByIdAndDelete(req.query.userId)
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
      
      const path=join(__dirname,'..','uploaded-files','users-images',req.query.userId,`user-cover-image`,req.params.imageName)
      return res.sendFile(path)
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
      
      const path=join(__dirname,'..','uploaded-files','users-images',req.query.userId,`user-profile-image`,req.params.imageName)
      return res.sendFile(path)
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
      console.log(friend)
      return res.json({success:true,followes:friend})
    }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
  static async generateToken(req,res,next){
   try{
    const token= await jwt.sign({id:req.user.id,},process.env.JWT_SECRET,{expiresIn:'2w'})
    return res.status(200).json({sucess:true,token:token,userId:req.user.id})
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
        let user=await User.findById(userId)
        if(!user)
        user=req.user
        // await user.save()
        res.json({success:true,user:user})
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
return      res.status(400).json({sucess:false,err:err.message})
    }
  }
  static async sendImage(req,res,next){
    try{
      const {image}=req
      console.log('done ',image)
      return res.json({success:true,image})
    }
    catch(err){
      console.log(err)
      return res.json({success:false,err:err.message})
    }
  }
}
  
module.exports=user