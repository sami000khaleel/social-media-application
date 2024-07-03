const mongoose = require('mongoose')
// const User
const postSchema=new mongoose.Schema({
   publisher:{
        type:mongoose.SchemaTypes.ObjectId,ref:'User'
    }
    ,
    community:{
    communityId:{type:mongoose.SchemaTypes.ObjectId,
    ref:'Community'
   },
  removed:{
    type:Boolean,
    default:false
  }}
    ,
describtion:{
    type:String,
},
//post that was shared
sharedPost:{post:{type:mongoose.SchemaTypes.ObjectId,ref:'Post'},removed:{
  type:Boolean,
  default:false
} }
,
badComments:{type:Boolean,default:false}
,
files:[{
    fileName:String,
  style:{
    top:String,
    bottom:String,
    scale:Number
  }  
}],
likes:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
dislikes:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
comments:[{type:mongoose.SchemaTypes.ObjectId,ref:'Comment'}],
//people who shared
shares:[{user:{type:mongoose.SchemaTypes.ObjectId,ref:'User'},
post:{type:mongoose.SchemaTypes.ObjectId,ref:'Post'}
}],
category:String,
postCategorySeq:Number
},{versionKey:false,timestamps:true})

    module.exports=mongoose.model('Post',postSchema)