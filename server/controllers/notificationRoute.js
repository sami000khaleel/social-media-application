const Notification=require('../models/notificationSchema.js')
// [NEW] the fields of the notifier (name and picture) that the client shows next to a notification
const {USER_CARD}=require('../utils/shape.js')
class notificationController{
    constructor(){

    }
    // [CHANGED] this handler was rewritten:
    //   GET /api/user/notifications          the latest 50 notifications (read and unread), new ones have sent:false
    //   GET /api/user/notifications?count=1  only the number of unread ones (for the badge on the bell)
    // why: before, only unread notifications came back, so after one visit the page was always empty
    static async getNotifications(req,res){
        try{
            // [SECURITY] the 'force' header that returned the notifications of EVERY user was removed.
            // The old code is kept here, commented out:
            // if(req.headers['force']==='force')
            //     {
            //         notifications=await Notification.find().sort({createdAt: 'desc'})
            //         return res.json({success:true,notifications})
            //     }
            if(req.query.count){
                const unsent=await Notification.find({sent:false,user:req.user.id})
                return res.json({success:true,unread:unsent.length})
            }
            const notifications=await Notification.find({user:req.user.id}).sort({createdAt: 'desc'}).limit(50).populate({path:'notifier',select:USER_CARD})
            // [NEW] the notifier is populated, so the client can show who did it
            // [FIX] answer with 'sent' as it was (so the client knows which are new), then mark them as read
            // one after the other: notifications.forEach(async ...) did not wait for the saves
            const answer=notifications.map(notification=>notification.toJSON())
            for (const notification of notifications) {
                if(notification.sent)
                    continue
                notification.sent=true
                await notification.save()
            }
            return res.json({success:true,notifications:answer})
        }
            catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=notificationController
