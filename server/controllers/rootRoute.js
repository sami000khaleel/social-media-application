const Post = require('../models/postSchema.js');
const User =require('../models/userSchema.js')
class rootRouteController{
  constructor(){

  }
  static async fetchPosts(req,res){
    try
    {
      const existingPostsCount=req.body.postsCount
      const posts=await Post.find().skip(existingPostsCount).limit(10)
      return res.status(200).json({success:true,response:posts})
    }
    catch(error){
    return  res.status(400).json({success:false,response:error.message})
    }

  }

}

module.exports=rootRouteController
