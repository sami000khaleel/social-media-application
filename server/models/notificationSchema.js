const mongoose = require('mongoose')
const notificationSchema=new mongoose.Schema({
    user:{type:mongoose.SchemaTypes.ObjectId,ref:'User'},
    sent:{type:Boolean,default:false,require:true},
       notifier:{type:mongoose.SchemaTypes.ObjectId,
        ref:'User'
       },
       subject:{
        model:String,
        action:String,
        id:String
       },
       message:String
    }
,{versionKey:false,timestamps:true})    
        
    

module.exports=mongoose.model('Notification',notificationSchema)