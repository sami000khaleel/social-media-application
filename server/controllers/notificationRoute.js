const Notification=require('../models/notificationSchema.js')
class notificationController{
    constructor(){

    }
    static async getNotifications(req,res){
        try{
            const {user}=req
            let notifications=[]
            if(req.headers['force']==='force')
                {
                    notifications=await Notification.find().sort({createdAt: 'desc'})            
                    return res.json({success:true,notifications})
                }
            notifications=await Notification.find({sent:false,user:req.user.id}).sort({createdAt: 'desc'})
            notifications.forEach(async(ele)=>{
                ele.sent=true
                await ele.save()
            })
            return res.json({success:true,notifications})
        }
            catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=notificationController