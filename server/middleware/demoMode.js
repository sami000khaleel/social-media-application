// [NEW] file: the public demo (turned on with DEMO_MODE=true in .env)
//
// When the app is published for visitors (recruiters), they should see the algorithm without signing up:
//  1. GET  /api/demo         lists the demo people (the seeded accounts that have a demoStory)
//  2. POST /api/demo/login   signs in with one click, no password, as a private copy of that person
//                            (so visitors who come at the same time never see each other's clicks)
//  3. guard                  the demo accounts are shared by every visitor, so they can react (like, dislike,
//                            share, follow, join communities) but not write, edit or delete anything
//  4. autoReset              the seeded story is relative to the day it was made ("the last 7 days"),
//                            so the demo reloads it every DEMO_RESET_HOURS hours (default 6) and on a fresh disk
// With DEMO_MODE off (the default) none of this does anything.
const path=require('path')
const fs=require('fs')
const {fork}=require('child_process')
const jwt=require('jsonwebtoken')
const crypto=require('crypto')
const User=require('../models/userSchema.js')
const Post=require('../models/postSchema.js')
const Community=require('../models/communitySchema.js')
const FeedLog=require('../models/feedLogSchema.js')
const Comment=require('../models/commentSchema.js')
const Notification=require('../models/notificationSchema.js')
const {USER_CARD,isId}=require('../utils/shape.js')

// how long a visitor's private copy lives
const COPY_HOURS=3
// true while fresh demo data is being loaded (the sign in page shows "Getting the demo ready")
let preparing=false
const TOPICS=['business','tech','entertainment','sport','politics']
// the four made-up people the sign-in page offers with demo mode off (client/src/seedAccounts.js)
const SEED_EMAILS=['lena.hoffmann@example.com','omar.haddad@example.com','sofia.marin@example.com','jonas.weber@example.com']

// [NEW] moves a made-up person's activity to now. The seed writes everything relative to the moment it ran
// ("liked 5 minutes ago", "away for 11 days"), and that moment is kept in demoTimeAt. Hours later those likes
// would be hours old and the story would be gone, so on sign-in every score point and every feed page is moved
// forward by the time that passed: the person did each thing just as long before now as before the seed.
// Only seeded people are moved, never real accounts (their dates are real).
async function freshen(user){
    if(!user||!user.demo||!user.demoTimeAt)
        return user
    const delta=Date.now()-new Date(user.demoTimeAt).getTime()
    if(delta<60*1000)
        return user
    const move=date=>new Date(new Date(date).getTime()+delta)
    TOPICS.forEach(topic=>{
        const points=(user.interests&&user.interests[topic])||[]
        user.interests[topic]=points.map(p=>({score:p.score,date:move(p.date),action:p.action}))
    })
    user.demoTimeAt=new Date()
    await user.save()
    const logs=await FeedLog.find({user:user.id})
    if(logs.length)
        await FeedLog.collection.bulkWrite(logs.map(log=>({updateOne:{filter:{_id:log._id},update:{$set:{createdAt:move(log.createdAt),updatedAt:move(log.createdAt)}}}})))
    return user
}

// a private copy of a demo person for one visitor: same scores, same feed pages, same follows and communities.
// Whatever the visitor clicks only changes the copy, so two visitors at the same time never see each other's clicks.
async function makeCopy(original){
    const data=original.toObject()
    delete data._id
    delete data.createdAt
    delete data.updatedAt
    data.email=`visitor-${crypto.randomBytes(6).toString('hex')}.${original.email}`
    data.demoStory=undefined
    data.demoCloneOf=original._id
    // likes and comments of the original stay on the original
    data.postsLiked=[]
    data.commentsLiked=[]
    const copy=await User.create(data)
    // the profile and cover pictures live in a folder named after the user id
    const pictures=path.join(__dirname,'..','uploaded-files','users-images')
    if(fs.existsSync(path.join(pictures,original.id)))
        fs.cpSync(path.join(pictures,original.id),path.join(pictures,copy.id),{recursive:true})
    // the "every time we sent you posts" history
    const logs=await FeedLog.find({user:original.id})
    if(logs.length){
        const copies=logs.map(log=>{
            const row=log.toObject()
            delete row._id
            row.user=copy._id
            return row
        })
        const inserted=await FeedLog.insertMany(copies)
        // insertMany may set the dates to now, so the original dates are written back
        await FeedLog.collection.bulkWrite(inserted.map((doc,i)=>({updateOne:{filter:{_id:doc._id},update:{$set:{createdAt:logs[i].createdAt,updatedAt:logs[i].createdAt}}}})))
    }
    // [NEW] the copy's activity is moved to now (the original stays as the seed made it)
    await freshen(copy)
    // the same communities
    const communities=await Community.find({'members.memberId':original._id})
    for (const community of communities) {
        community.members.push({memberId:copy._id})
        await community.save()
    }
    return copy
}
// deletes the copies that are older than COPY_HOURS, with everything they changed
async function removeOldCopies(){
    const old=await User.find({demoCloneOf:{$exists:true},createdAt:{$lt:new Date(Date.now()-COPY_HOURS*60*60*1000)}})
    for (const copy of old) {
        const id=copy.id
        await FeedLog.deleteMany({user:id})
        // the posts the visitor shared, and the likes, dislikes and shares on other posts
        await Post.deleteMany({publisher:id})
        for (const post of await Post.find({$or:[{likes:id},{dislikes:id},{'shares.user':id}]})) {
            post.likes=post.likes.filter(x=>x.toString()!==id)
            post.dislikes=post.dislikes.filter(x=>x.toString()!==id)
            post.shares=post.shares.filter(share=>share.user.toString()!==id)
            await post.save()
        }
        for (const community of await Community.find({'members.memberId':copy._id})) {
            community.members=community.members.filter(m=>m.memberId.toString()!==id)
            await community.save()
        }
        // likes and dislikes on comments, follows, and the notifications the visitor's clicks made
        for (const comment of await Comment.find({$or:[{likedBy:id},{dislikedBy:id}]})) {
            comment.likedBy=comment.likedBy.filter(x=>x.toString()!==id)
            comment.dislikedBy=comment.dislikedBy.filter(x=>x.toString()!==id)
            await comment.save()
        }
        for (const user of await User.find({$or:[{followers:id},{followes:id}]})) {
            user.followers=user.followers.filter(x=>x.toString()!==id)
            user.followes=user.followes.filter(x=>x.toString()!==id)
            await user.save()
        }
        await Notification.deleteMany({$or:[{user:id},{notifier:id}]})
        await copy.deleteOne()
        fs.rmSync(path.join(__dirname,'..','uploaded-files','users-images',id),{recursive:true,force:true})
    }
    if(old.length)
        console.log(`demo: removed ${old.length} old visitor copies`)
}

const on=()=>String(process.env.DEMO_MODE).toLowerCase()==='true'
const MESSAGE='This is a shared demo account, so writing and editing are turned off. Likes, dislikes, shares, follows and joining communities all work.'

// what a demo account may still do (method + path under /api)
const ALLOWED=[
    ['PATCH',/^\/posts\/(like|dislike)$/],
    ['PATCH',/^\/comments\/(likes|dislikes)$/],
    ['PATCH',/^\/user\/followers$/],
    ['POST',/^\/community\/members(\/join)?$/],
    ['DELETE',/^\/community\/members(\/join)?$/],
    ['POST',/^\/user\/login$/],
    ['POST',/^\/demo\/login$/],
]
// a share is a POST /posts with the shared-post-id header; in the demo it is allowed without your own text or files
const isPlainShare=req=>req.method==='POST'&&req.path==='/posts'&&req.headers['shared-post-id']&&!(req.body&&req.body.describtion)&&!(req.files&&req.files.length)

class demoMode{
    static on(){ return on() }
    static get MESSAGE(){ return MESSAGE }
    // GET /api/demo
    static async info(req,res){
        try{
            // [CHANGED] demo mode off (your own computer): still list the made-up people the seed made, with their
            // email, so the sign-in page can offer them as one-click sign-ins with their password. A database
            // without the seed has none, and the page then shows only the normal form.
            if(!on()){
                // found by email, so a database seeded by an older version of the seed works too
                const people=await User.find({email:{$in:SEED_EMAILS}}).select(`${USER_CARD} demoStory email`)
                return res.json({success:true,enabled:false,accounts:people.map(a=>({_id:a.id,firstName:a.firstName,lastName:a.lastName,profileImage:a.profileImage,demoStory:a.demoStory,email:a.email}))})
            }
            if(preparing)
                return res.json({success:true,enabled:true,preparing:true,accounts:[]})
            const accounts=await User.find({demo:true,demoStory:{$exists:true},demoCloneOf:{$exists:false}}).select(`${USER_CARD} demoStory job email`)
            // [CHANGED] with the made-up email, so the sign-in page can match them to its four people
            return res.json({success:true,enabled:true,preparing:false,accounts:accounts.filter(a=>a.demoStory).map(a=>({_id:a.id,firstName:a.firstName,lastName:a.lastName,profileImage:a.profileImage,demoStory:a.demoStory,email:a.email}))})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    // POST /api/demo/login {userId}
    static async login(req,res){
        try{
            if(!on())
                return res.status(404).json({success:false,err:'the demo is turned off'})
            if(preparing)
                return res.status(503).json({success:false,preparing:true,err:'The demo is getting ready. One moment please.'})
            const {userId}=req.body
            const original=isId(String(userId))?await User.findById(userId):null
            if(!original||!original.demo||!original.demoStory||original.demoCloneOf)
                return res.status(400).json({success:false,err:'this is not a demo account'})
            removeOldCopies().catch(err=>console.log(err))
            const user=await makeCopy(original)
            const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:`${COPY_HOURS}h`})
            return res.status(201).json({success:true,token,user})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    // [NEW] runs after the email + password check: someone who signs in to a made-up person with the password
    // from SEED-ACCOUNTS.md gets a private copy too, the same as the one-click button, so the original stays clean
    static async passwordLogin(req,res,next){
        try{
            // [NEW] demo mode off (your own computer): a made-up person who signs in with the password has their
            // activity moved to now, so the story still reads "5 minutes ago" the day after you ran the seed
            if(!on()&&req.user&&req.user.demo&&!req.user.demoCloneOf)
                await freshen(req.user)
            if(!on()||!req.user||!req.user.demo||req.user.demoCloneOf)
                return next()
            if(preparing)
                return res.status(503).json({success:false,preparing:true,err:'The demo is getting ready. One moment please.'})
            removeOldCopies().catch(err=>console.log(err))
            const user=await makeCopy(req.user)
            const token=jwt.sign({userId:user.id},process.env.JWT_SECRET,{expiresIn:`${COPY_HOURS}h`})
            return res.status(201).json({success:true,token,user})
        }
        catch(err){
            return res.json({success:false,err:err.message})
        }
    }
    // runs before every /api route: refuses writes from demo accounts (reads are always fine)
    static async guard(req,res,next){
        try{
            if(!on()||req.method==='GET'||req.method==='OPTIONS')
                return next()
            const bearer=req.headers['authorization']
            if(!bearer)
                return next()
            let data
            try{ data=jwt.verify(bearer.split(' ')[1],process.env.JWT_SECRET) }
            catch{ return next() }        // a bad token is answered by verifyToken in the route
            const user=await User.findById(data.userId).select('demo')
            if(!user||!user.demo)
                return next()
            if(ALLOWED.some(([method,pattern])=>method===req.method&&pattern.test(req.path))||isPlainShare(req))
                return next()
            return res.status(403).json({success:false,err:MESSAGE})
        }
        catch(err){
            return next()
        }
    }
    // keeps the demo data fresh: on start (when it was never seeded on this disk or is too old) and every hour after
    static autoReset(){
        if(!on())
            return
        const hours=Number(process.env.DEMO_RESET_HOURS)||6
        const marker=path.join(__dirname,'..','uploaded-files','.seeded-at')
        let running=false
        const check=(atStart)=>{
            if(!atStart)
                removeOldCopies().catch(err=>console.log(err))
            if(running)
                return
            let last=0
            try{ last=new Date(fs.readFileSync(marker,'utf8')).getTime()||0 }catch{ /* never seeded on this disk */ }
            const age=Date.now()-last
            if(age<hours*60*60*1000)
                return
            // someone is looking around right now (a copy made in the last 30 minutes): wait, so their page
            // does not vanish under them. After twice the normal time the data is reloaded anyway.
            if(!atStart&&age<2*hours*60*60*1000)
                return User.exists({demoCloneOf:{$exists:true},createdAt:{$gt:new Date(Date.now()-30*60*1000)}})
                    .then(busy=>busy?console.log('demo: a visitor is active, the reload waits an hour'):start())
                    .catch(err=>console.log(err))
            start()
        }
        const start=()=>{
            if(running)
                return
            running=true
            preparing=true
            console.log('demo: loading fresh demo data ...')
            // the seed script runs in its own process with its own database connection
            const child=fork(path.join(__dirname,'..','scripts','seed.js'),['--reset'],{stdio:'inherit'})
            child.on('exit',code=>{
                running=false
                preparing=false
                console.log(code===0?'demo: fresh demo data loaded':`demo: the seed script failed (exit code ${code})`)
            })
        }
        // the first check runs at once, before anyone can click: a fresh disk (a free host that slept)
        // must never hand out a copy of data that is about to be replaced
        check(true)
        setInterval(()=>check(false),60*60*1000).unref()
    }
}
demoMode.removeOldCopies=removeOldCopies
demoMode.freshen=freshen
module.exports=demoMode
