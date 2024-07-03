const mongoose=require('mongoose')
const communitySchema=new mongoose.Schema({
    waitingList:[{userId:{type:mongoose.SchemaTypes.ObjectId,ref:'User'},askedAt:{
    type:Date,
    default:()=> new Date()

}}]
,
blockedUsers:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
coverImageName:{
    type:String,
    default:null
},
category:String,
public:{
    type:Boolean,
    default:false
}
    ,postApproval:{
        type:Boolean,
        default:false
    },
    manager:{type:mongoose.SchemaTypes.ObjectId,ref:'User',required:true}
    ,admins:[
        {type:mongoose.SchemaTypes.ObjectId
        ,ref:'User'}]
    ,communityName:{
        type:String,
        required:true
    },
    describtion:{
        required:true,
        type:String
    },
    posts:[{postId:{type:mongoose.SchemaTypes.ObjectId,ref:'Post'}
    ,approved:{
        type:Boolean,
        default:false
    }}],
    members:[{memberId:{type:mongoose.SchemaTypes.ObjectId,ref:'User'}
    
    ,joinedAt:{
        type:Date,
        default:()=> new Date()
    }}]    
},{versionKey:false,timestamps:true})
module.exports=mongoose.model('Community',communitySchema)