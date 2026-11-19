// [NEW] file: direct messages between two users (replaces the Firebase chat)
// The same actions work over HTTP (routes/messageRoute.js) and over the socket (listen below),
// so a message is saved and delivered the same way whichever one the client uses.
const Message=require('../models/messageSchema.js')
const User=require('../models/userSchema.js')
const realtime=require('../realtime.js')
const {USER_CARD,isId}=require('../utils/shape.js')
const demoMode=require('../middleware/demoMode.js')
// const interestsMiddleWare = require('../middleware/interestsMiddleware.js')

const MAX_LENGTH=2000

// saves a message from one user to another and sends it to both of them
async function send(fromId,toId,text){
    // [NEW] the shared demo accounts can not send messages (see middleware/demoMode.js); the socket skips the HTTP guard
    if(demoMode.on()){
        const sender=await User.findById(fromId).select('demo')
        if(sender&&sender.demo)
            throw new Error(demoMode.MESSAGE)
    }
    text=String(text||'').trim()
    if(!text)
        throw new Error('the message is empty')
    if(text.length>MAX_LENGTH)
        throw new Error(`a message can have at most ${MAX_LENGTH} characters`)
    if(!isId(String(toId))||String(toId)===String(fromId))
        throw new Error('choose someone to write to')
    const receiver=await User.findById(toId)
    if(!receiver)
        throw new Error('this person does not exist any more')
    // people who blocked you do not get your messages
    if(receiver.blockedUsers.some(id=>id.toString()===String(fromId)))
        throw new Error('you can not write to this person')
    const message=await Message.create({from:fromId,to:toId,text})
    const data=message.toJSON()
    realtime.toUser(fromId,'message:new',data)
    realtime.toUser(toId,'message:new',data)
    // [AI OFF] the old app sent chat messages to the AI server to find their topic and scored it with 'messages' (+6):
    // const category= await axios.get(`http://127.0.0.1:5000/api/ai/messages`,{messages:[text]})
    // await interestsMiddleWare.updateScore(category,'messages',sender)
    return data
}
// marks every unread message from otherId to me as read and tells the other person
async function markRead(meId,otherId){
    const unread=await Message.find({from:otherId,to:meId,readAt:null})
    if(!unread.length)
        return 0
    const now=new Date()
    for (const message of unread) {
        message.readAt=now
        await message.save()
    }
    realtime.toUser(otherId,'message:read',{by:String(meId),at:now})
    return unread.length
}

class messageController{
    // GET /api/messages/conversations: one entry per person you wrote with, newest first
    static async conversations(req,res){
        try{
            const me=req.user.id
            const messages=await Message.find({$or:[{from:me},{to:me}]}).sort({createdAt:-1})
            const byPerson=new Map()
            for (const message of messages) {
                const other=message.from.toString()===me?message.to.toString():message.from.toString()
                if(!byPerson.has(other))
                    byPerson.set(other,{last:message,unread:0})
                if(message.to.toString()===me&&!message.readAt)
                    byPerson.get(other).unread++
            }
            const conversations=[]
            for (const [other,{last,unread}] of byPerson) {
                const user=await User.findById(other).select(USER_CARD)
                if(user)
                    conversations.push({user,lastMessage:last,unread,online:realtime.isOnline(other)})
            }
            return res.json({success:true,conversations})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    // GET /api/messages/unread: how many messages you have not read (for the badge)
    static async unread(req,res){
        try{
            const unread=await Message.countDocuments({to:req.user.id,readAt:null})
            return res.json({success:true,unread})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    // GET /api/messages/:userId?before=<date>: the last 50 messages with one person (older ones with "before")
    // opening a conversation marks it as read
    static async thread(req,res){
        try{
            const me=req.user.id
            const other=req.params.userId
            if(!isId(other))
                return res.json({success:false,err:'no user was found'})
            const user=await User.findById(other).select(USER_CARD)
            if(!user)
                return res.json({success:false,err:'no user was found'})
            const filter={$or:[{from:me,to:other},{from:other,to:me}]}
            if(req.query.before)
                filter.createdAt={$lt:new Date(req.query.before)}
            const newest=await Message.find(filter).sort({createdAt:-1}).limit(50)
            await markRead(me,other)
            return res.json({success:true,user,online:realtime.isOnline(other),messages:newest.reverse(),more:newest.length===50})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    // POST /api/messages {to,text}: send without a socket
    static async send(req,res){
        try{
            const message=await send(req.user.id,req.body.to,req.body.text)
            return res.json({success:true,message})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    // the socket side (called by realtime.js for every connection)
    static listen(socket){
        const me=socket.data.userId
        // message:send {to,text}, answer({success,message|err})
        socket.on('message:send',async(data,answer)=>{
            const reply=typeof answer==='function'?answer:()=>{}
            try{
                const message=await send(me,data&&data.to,data&&data.text)
                reply({success:true,message})
            }
            catch(err){
                reply({success:false,err:err.message})
            }
        })
        // message:read {from}: the client has the conversation open and saw new messages
        socket.on('message:read',async(data)=>{
            try{
                if(data&&isId(String(data.from)))
                    await markRead(me,data.from)
            }
            catch(err){
                console.log(err)
            }
        })
        // typing {to,typing}: passed on to the other person, nothing is saved
        socket.on('typing',(data)=>{
            if(data&&isId(String(data.to))&&String(data.to)!==me)
                realtime.toUser(data.to,'typing',{from:me,typing:Boolean(data.typing)})
        })
    }
}
module.exports=messageController
