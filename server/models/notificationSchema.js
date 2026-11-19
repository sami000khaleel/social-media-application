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
        
    

// [NEW] every NEW notification is pushed to the user's open tabs over Socket.IO right after it is saved.
// why: notifications were only seen after a page reload. A hook here covers every Notification.create(...)
// in the project without changing any of them. (insertMany, used by the seed script, does not run it.)
notificationSchema.pre('save',function(next){
    this.$locals.wasNew=this.isNew
    next()
})
notificationSchema.post('save',function(doc){
    if(doc.$locals.wasNew)
        require('../realtime.js').notification(doc)
})
module.exports=mongoose.model('Notification',notificationSchema)
