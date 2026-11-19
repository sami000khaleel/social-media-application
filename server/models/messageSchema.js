// [NEW] file: one direct message between two users (replaces the Firebase chat)
const mongoose = require('mongoose')
const messageSchema=new mongoose.Schema({
    from:{type:mongoose.SchemaTypes.ObjectId,ref:'User',required:true},
    to:{type:mongoose.SchemaTypes.ObjectId,ref:'User',required:true},
    text:{type:String,required:true},
    // null until the receiver opens the conversation ("Seen" in the client)
    readAt:{type:Date,default:null}
},{versionKey:false,timestamps:true})
module.exports=mongoose.model('Message',messageSchema)
