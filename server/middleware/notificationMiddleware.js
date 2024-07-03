const Notification =require('../models/notificationSchema.js')
class notification {
    constructor(){

    }
    static async createLikePostNotification(req,res,next){
        try
        {
            console.log('a')
            
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
}