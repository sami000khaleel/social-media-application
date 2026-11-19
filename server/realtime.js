// [NEW] file: Socket.IO, the real-time part of the server (it replaces the Firebase features)
//
//  - every signed-in tab opens one socket; the token is checked like in verifyToken
//  - every socket joins the room "user:<id>", so the server can reach all tabs of one user
//  - events the server sends:
//      notification     a new notification (see the hook in models/notificationSchema.js)
//      interests        a new point in one interest history (see interestsMiddleware.updateScore)
//      message:new      a direct message to or from you
//      message:read     the other person opened your messages
//      typing           the other person is typing
//      presence         someone came online / went offline,  presence:list  who is online right now
//  - events the client sends: message:send, message:read, typing (see controllers/messageRoute.js)
const jwt=require('jsonwebtoken')
const {USER_CARD}=require('./utils/shape.js')

let io=null
// userId -> number of open sockets (one user can have several tabs)
const online=new Map()
const room=userId=>`user:${userId}`

function attach(httpServer){
    const {Server}=require('socket.io')
    // [CHANGED] the same allowed addresses as the API (CLIENT_URL, see server.js)
    const clientUrls=(process.env.CLIENT_URL||'').split(',').map(url=>url.trim().replace(/\/$/,'')).filter(Boolean)
    io=new Server(httpServer,{cors:{origin:clientUrls.length?clientUrls:'*'}})
    // the same check as authentication.verifyToken, for the socket handshake
    io.use(async(socket,next)=>{
        try{
            const token=socket.handshake.auth&&socket.handshake.auth.token
            if(!token)
                return next(new Error('you are not signed in'))
            const data=jwt.verify(token,process.env.JWT_SECRET)
            const User=require('./models/userSchema.js')
            const user=await User.findById(data.userId)
            if(!user)
                return next(new Error('this account does not exist any more'))
            socket.data.userId=user.id
            return next()
        }
        catch(err){
            return next(new Error(err.message))
        }
    })
    io.on('connection',socket=>{
        const userId=socket.data.userId
        socket.join(room(userId))
        const tabs=(online.get(userId)||0)+1
        online.set(userId,tabs)
        if(tabs===1)
            io.emit('presence',{userId,online:true})
        socket.emit('presence:list',[...online.keys()])
        // direct messages and typing
        require('./controllers/messageRoute.js').listen(socket)
        socket.on('disconnect',()=>{
            const left=(online.get(userId)||1)-1
            if(left>0)
                return online.set(userId,left)
            online.delete(userId)
            io.emit('presence',{userId,online:false})
        })
    })
    return io
}
// sends an event to every open tab of one user (does nothing when Socket.IO is not running, e.g. in the seed script)
function toUser(userId,event,data){
    if(io)
        io.to(room(String(userId))).emit(event,data)
}
async function notification(doc){
    try{
        if(!io)
            return
        await doc.populate({path:'notifier',select:USER_CARD})
        toUser(doc.user,'notification',doc.toJSON())
    }
    catch(err){
        console.log(err)
    }
}
const isOnline=userId=>online.has(String(userId))
module.exports={attach,toUser,notification,isOnline}
