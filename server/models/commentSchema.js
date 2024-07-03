const mongoose = require('mongoose')
const commentSchema=new mongoose.Schema(
    {
        user:{type:mongoose.SchemaTypes.ObjectId,ref:'User'}
        ,content:{
            type:String,
            reqiured:true
        },
        postId:{type:mongoose.SchemaTypes.ObjectId,ref:'Post'}
        ,
        badComment:{type:Boolean,default:true},
        //comment
        repliedBy:[{type:mongoose.SchemaTypes.ObjectId,ref:'Comment'}],
        repliedTo:String,
        dislikedBy:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
        likedBy:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
        positivity:Boolean

    }
,{versionKey:false,timestamps:true})    
module.exports=mongoose.model('Comment',commentSchema)