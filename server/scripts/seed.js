// [NEW] file: the demo data script (npm run seed / npm run seed:reset)
// Fills the database with a small, realistic looking network:
// people, pictures, posts, comments, communities and five weeks of reactions.
//
//   npm run seed          only works on an empty database
//   npm run seed:reset    deletes everything first (users, posts, comments, communities, notifications, uploaded files)
//
// Every reaction has its own timestamp and is written the same way the server writes it:
// the like is stored on the post and on the user, and a point is added to the
// interest history of the user (user.interests) with the score from interestsMiddleware.
const path=require('path')
const fs=require('fs')
const crypto=require('crypto')
require('dotenv').config({path:path.join(__dirname,'..','.env')})
const mongoose=require('mongoose')
const bcrypt=require('bcrypt')
const User=require('../models/userSchema.js')
const Post=require('../models/postSchema.js')
const Comment=require('../models/commentSchema.js')
const Community=require('../models/communitySchema.js')
const Notification=require('../models/notificationSchema.js')
const Message=require('../models/messageSchema.js')
const interests=require('../middleware/interestsMiddleware.js')
const content=require('./seed-content.js')
const images=require('./seed-images.js')

const {CATEGORIES,actionsScores,calcNewLast,calcMix,planPage,pickSurprises,halvesOf,PAGE_SIZE}=interests
const FeedLog=require('../models/feedLogSchema.js')
const UPLOADS=path.join(__dirname,'..','uploaded-files')
const DAY=24*60*60*1000, HOUR=60*60*1000, MINUTE=60*1000
const DAYS=35                       // how far back the story goes
const NOW=Date.now()
const END=NOW-40*MINUTE             // [CHANGED] nothing happens in the last 40 minutes (longer than a 30-minute session), so a fresh login starts with an empty session
const START=NOW-DAYS*DAY

// the same "random" numbers on every run, so the accounts and passwords never change
let seedNumber=20261113
function rng(){
    seedNumber|=0; seedNumber=seedNumber+0x6D2B79F5|0
    let t=Math.imul(seedNumber^seedNumber>>>15,1|seedNumber)
    t=t+Math.imul(t^t>>>7,61|t)^t
    return ((t^t>>>14)>>>0)/4294967296
}
const pick=list=>list[Math.floor(rng()*list.length)]
const chance=p=>rng()<p
const between=(a,b)=>a+rng()*(b-a)
function weightedPick(list,weightOf){
    const weights=list.map(weightOf)
    const total=weights.reduce((sum,w)=>sum+w,0)
    if(total<=0) return null
    let r=rng()*total
    for (let i = 0; i < list.length; i++) { r-=weights[i]; if(r<=0) return list[i] }
    return list[list.length-1]
}
const newId=()=>new mongoose.Types.ObjectId()
const hex=()=>crypto.randomBytes(8).toString('hex')

// ---------------------------------------------------------------- the people
const people=content.PEOPLE.map((p,index)=>{
    const createdAt=p.brandNew?NOW-25*MINUTE:START-between(2,40)*DAY
    return {
        // the same id on every run (from the email), so a visitor who is signed in stays signed in after a reset
        ...p,index,_id:new mongoose.Types.ObjectId(crypto.createHash('md5').update(`${p.first}.${p.last}`).digest('hex').slice(0,24)),
        email:`${p.first}.${p.last}@example.com`.toLowerCase(),
        plainPassword:`${pick(content.WORDS_A)}-${pick(content.WORDS_B)}-${10+Math.floor(rng()*90)}`,
        createdAt,
        // every interest starts at 0 when the account is created, like in createUser
        history:Object.fromEntries(CATEGORIES.map(c=>[c,[{score:0,date:new Date(createdAt)}]])),
        posts:[],postsLiked:[],comments:[],commentsLiked:[],followers:[],followes:[],
        communities:[],managedCommunities:[],adminedCommunities:[],
    }
})
// how much a person cares about a category at a given moment (0..1)
function affinity(person,category,time){
    let weights=person.weights
    if(person.drift){
        const progress=Math.min(1,Math.max(0,(time-START)/(END-START)))
        // the change happens in the middle weeks
        const mix=Math.min(1,Math.max(0,(progress-0.3)/0.4))
        weights=person.weights.map((w,i)=>w*(1-mix)+person.drift[i]*mix)
    }
    return weights[CATEGORIES_ORDER.indexOf(category)]/Math.max(...weights)
}
const CATEGORIES_ORDER=['business','tech','entertainment','sport','politics']   // the order of the weights in seed-content.js
// [NEW] everybody without a story also cares a little about one or two other topics, so their reactions are not
// all about one thing (done after the passwords were drawn, so the passwords stay the same)
people.filter(p=>!p.story).forEach(p=>{
    p.weights=p.weights.map((w,i)=>CATEGORIES_ORDER[i]===p.dislikes?w:w+(chance(0.45)?between(0.5,3):0))
})

// adds one point to an interest history, exactly like interestsMiddleware.updateScore
function track(person,category,action,time){
    const history=person.history[category]
    const last=history[history.length-1]
    // two actions never share the same millisecond
    const date=new Date(Math.max(time,last.date.getTime()+1000))
    history.push({score:calcNewLast(last,date).score+actionsScores[action],date,action})
}

const posts=[],comments=[],communities=[],notifications=[]
const notify=(user,notifier,model,action,id,time)=>{
    if(notifier&&String(user)===String(notifier)) return
    notifications.push({_id:newId(),user,notifier,subject:{model,action,id:String(id)},sent:time<NOW-36*HOUR,createdAt:new Date(time+1000)})
}
const seqs=Object.fromEntries(CATEGORIES.map(c=>[c,0]))
function addPost(author,category,text,time,{picture=false,community=null,shared=null}={}){
    const post={
        _id:newId(),publisher:author._id,author,describtion:text,category,files:[],likes:[],dislikes:[],comments:[],shares:[],
        sharedPost:{post:shared?shared._id:null,removed:false},
        community:{communityId:community?community._id:null,removed:false},
        createdAt:new Date(time),pictures:picture?(chance(0.15)?2:1):0,
        // [NEW] how much this post catches on: most are ordinary, a few take off (a long tail, like real feeds)
        appeal:chance(0.12)?between(2.2,4.5):between(0.35,1.4),
        // [NEW] some posts split opinions: more dislikes and disagreeing comments
        controversial:chance(category==='politics'||category==='business'?0.3:0.1),
    }
    if(!community)
        post.postCategorySeq=++seqs[category]     // only posts outside communities get a place in the feed
    posts.push(post)
    author.posts.push(post._id)
    return post
}

// ---------------------------------------------------------------- plan everything that happens, then play it in order
const events=[]
const active=person=>!person.brandNew
// a moment of the day when people are usually online
function momentOn(day){
    const hour=weightedPick([7,8,9,12,13,17,18,19,20,21,22,23],h=>({7:2,8:4,9:3,12:4,13:4,17:3,18:5,19:7,20:8,21:8,22:5,23:2})[h])
    return START+day*DAY+hour*HOUR+between(0,59)*MINUTE-(START%DAY)
}
const inside=time=>time>START&&time<END

// communities are created in the first days by a fitting person
content.COMMUNITIES.forEach((c,i)=>{
    const manager=weightedPick(people.filter(p=>active(p)&&!p.managedCommunities.length&&!p.planned),p=>p.weights[CATEGORIES_ORDER.indexOf(c.category)]**2)
    manager.planned=true
    events.push({type:'community',time:START+between(0.2,2.5)*DAY,manager,spec:c})
})
// posts: people write about what they care about
CATEGORIES.forEach(category=>{
    content.POSTS[category].forEach(([text,picture])=>{
        events.push({type:'post',time:START+between(0.3,DAYS-0.05)*DAY,category,text,picture})
    })
})
// sessions: every time a person opens the app they do a few things in a row
people.filter(active).forEach(person=>{
    for (let day = 0; day < DAYS; day++) {
        if(person.quietDays&&day>=DAYS-person.quietDays) continue
        let sessions=Math.floor(person.activity)+(chance(person.activity%1)?1:0)
        if(chance(0.12)) sessions=0                     // some days people are just busy
        for (let s = 0; s < sessions; s++) {
            let time=momentOn(day)
            // opening the app loads a page of the feed, exactly like GET /api/get-posts
            if(inside(time)) events.push({type:'feed',time,person})
            const actions=2+Math.floor(rng()*7)
            // some people pull to refresh after a few reactions: that page has a session half of its own
            const refreshAt=actions>=4&&chance(0.45)?3:-1
            for (let a = 0; a < actions; a++) {
                time+=between(15,110)*1000
                if(inside(time)) events.push({type:'action',time,person})
                if(a===refreshAt&&inside(time+20000)) events.push({type:'feed',time:time+20000,person})
            }
        }
    }
})
events.sort((a,b)=>a.time-b.time)

// the page of the feed a person got at that moment: the same calcMix and allocate the server uses
const feedLogs=[]
function deliver(person,time){
    const mix=calcMix(person.history,new Date(time))
    // [CHANGED] pages of 30, half week and half session, with random surprise posts, like the server
    // (the seed's own rng keeps runs the same)
    const surprises=planPage(mix,PAGE_SIZE)
    pickSurprises(mix.derivatives,surprises,rng)
    const visible=posts.filter(p=>!p.community.communityId&&p.createdAt.getTime()<time&&p.author!==person)
    const chosen=[]
    const sessionReason=mix.session.basis==='session'?'session':'week'
    mix.derivatives.forEach((d,j)=>{
        const fromWeek=mix.week.derivatives[j].postsNumber,fromSession=mix.session.derivatives[j].postsNumber
        const wanted=fromWeek+fromSession+d.exploreNumber
        if(!wanted) return
        visible.filter(p=>p.category===d.interest).slice(-wanted).reverse()
            .forEach((p,k)=>chosen.push({post:p._id,category:p.category,reason:k<fromWeek?'week':k<fromWeek+fromSession?sessionReason:'surprise'}))
    })
    // an interest without enough posts: the newest other posts fill the page
    const taken=new Set(chosen.map(c=>String(c.post)))
    visible.slice().reverse().filter(p=>!taken.has(String(p._id))).slice(0,PAGE_SIZE-chosen.length)
        .forEach(p=>chosen.push({post:p._id,category:p.category,reason:'filler'}))
    if(!chosen.length) return      // nothing had been posted yet
    // what this person reacts to in the next minutes comes mostly from this page
    person.lastFeed={time,ids:new Set(chosen.map(c=>String(c.post)))}
    feedLogs.push({_id:newId(),user:person._id,basis:mix.basis,limit:PAGE_SIZE,results:mix.derivatives,halves:JSON.parse(JSON.stringify(halvesOf(mix))),posts:chosen,createdAt:new Date(time),updatedAt:new Date(time)})
}

function play(event){
    const {time}=event
    if(event.type==='feed')
        return deliver(event.person,time)
    if(event.type==='community'){
        const {manager,spec}=event
        const community={_id:newId(),...spec,manager,admins:[],members:[{person:manager,joinedAt:new Date(time)}],waitingList:[],posts:[],createdAt:new Date(time)}
        communities.push(community)
        manager.managedCommunities.push(community._id)
        track(manager,spec.category,'createCommunity',time)
        return
    }
    if(event.type==='post'){
        const author=weightedPick(people.filter(p=>active(p)&&p.createdAt<time&&!(p.quietDays&&time>END-p.quietDays*DAY)),p=>affinity(p,event.category,time)**2*p.activity)
        addPost(author,event.category,event.text,time,{picture:event.picture})
        track(author,event.category,'createPost',time)
        return
    }
    const {person}=event
    const roll=rng()
    // sometimes: something in a community
    if(roll<0.10&&communities.length){
        const community=weightedPick(communities,c=>0.05+affinity(person,c.category,time)**2)
        const isMember=community.members.some(m=>m.person===person)
        const waiting=community.waitingList.some(w=>w.person===person)
        if(!isMember&&affinity(person,community.category,time)>0.5){
            if(community.public){
                community.members.push({person,joinedAt:new Date(time)})
                person.communities.push({communityId:community._id,approved:true})
                track(person,community.category,'joinCommunity',time)
                notifications.push({_id:newId(),user:person._id,subject:{model:'Community',action:'memberJoin',id:String(community._id)},sent:time<NOW-36*HOUR,createdAt:new Date(time)})
            }else if(!waiting){
                community.waitingList.push({person,askedAt:new Date(time)})
                person.communities.push({communityId:community._id,approved:false})
                notify(community.manager._id,person._id,'Community','membershipRequest',community._id,time)
                // most requests are approved a few hours later, the newest ones stay open
                events.pending.push({type:'approve',time:time+between(1,20)*HOUR,community,person})
            }
        }else if(isMember&&community.manager!==person&&!community.admins.includes(person)&&(affinity(person,community.category,time)<0.45&&chance(0.3)||chance(0.03))){
            // [NEW] lost interest: leaves the community (their posts there stay)
            community.members=community.members.filter(m=>m.person!==person)
            person.communities=person.communities.filter(c=>c.communityId!==community._id)
            track(person,community.category,'leaveCommunity',time)
        }else if(isMember){
            const texts=content.COMMUNITY_POSTS[community.name]
            const unused=texts.filter(t=>!community.posts.some(p=>p.post.describtion===t))
            if(unused.length&&chance(0.5)){
                const post=addPost(person,community.category,unused[0],time,{community})
                const isStaff=community.manager===person||community.admins.includes(person)
                community.posts.push({post,approved:!community.postApproval||isStaff||time<END-2*DAY})
            }else if(community.public||isMember)
                track(person,community.category,'viewCommunity',time)
        }
        return
    }
    // otherwise: look at a post. People mostly see recent posts about what they like.
    let candidates=posts.filter(p=>p.author!==person&&p.createdAt.getTime()<time&&time-p.createdAt.getTime()<9*DAY&&(!p.community.communityId||communities.find(c=>c._id===p.community.communityId).members.some(m=>m.person===person)))
    // three times out of four the post comes from the page the feed just sent (the feed shapes what people see)
    const fromFeed=person.lastFeed&&time-person.lastFeed.time<2*HOUR&&chance(0.75)?candidates.filter(p=>person.lastFeed.ids.has(String(p._id))):[]
    if(fromFeed.length) candidates=fromFeed
    // [CHANGED] popular posts get seen more, and people look beyond their favourite topics more often
    const post=weightedPick(candidates,p=>(0.22+affinity(person,p.category,time)**2)*p.appeal/(1+(time-p.createdAt.getTime())/DAY))
    if(!post) return
    const love=affinity(person,post.category,time)
    const liked=post.likes.includes(person._id), disliked=post.dislikes.includes(person._id)
    const hates=person.dislikes===post.category
    // [CHANGED] more kinds of reactions: likes, dislikes, taking a like back, comments that disagree,
    // likes and dislikes on comments, shares. How likely each one is depends on the person and the post.
    if(liked&&chance(0.05)){
        // changed their mind about a post they liked
        post.likes=post.likes.filter(id=>id!==person._id)
        person.postsLiked=person.postsLiked.filter(id=>id!==post._id)
        track(person,post.category,'unlikePost',time)
        return
    }
    if(!liked&&!disliked){
        const dislikeChance=hates?0.6:(love<0.15?0.12:0.03)+(post.controversial?0.16:0)
        const likeChance=hates?0:Math.min(0.92,(0.18+0.6*love)*Math.min(1.6,0.55+post.appeal*0.35))
        const r=rng()
        if(r<dislikeChance){
            post.dislikes.push(person._id)
            track(person,post.category,'dislikePost',time)
            if(hates||chance(0.6)) return
        }else if(r<dislikeChance+likeChance){
            post.likes.push(person._id)
            person.postsLiked.push(post._id)
            track(person,post.category,'likePost',time)
            notify(post.publisher,person._id,'Post','likePost',post._id,time)
        }
    }
    if(hates) return
    const again=rng()
    if(again<0.13*love+0.05+(post.controversial?0.05:0)){
        // a comment, or a reply to one of the comments under the post
        const under=comments.filter(c=>c.postId===post._id)
        const parent=under.length&&chance(0.4)?pick(under):null
        const against=post.controversial?chance(0.4):chance(0.08)
        const comment={_id:newId(),user:person._id,postId:post._id,
            content:parent?pick(content.REPLIES):against?pick(content.DISAGREE):pick(content.COMMENTS[post.category]),
            repliedTo:parent?String(parent._id):null,repliedBy:[],likedBy:[],dislikedBy:[],badComment:false,positivity:true,createdAt:new Date(time+20000)}
        if(!parent&&under.some(c=>c.content===comment.content)) return
        comments.push(comment)
        post.comments.push(comment._id)
        person.comments.push(comment._id)
        if(parent) parent.repliedBy.push(comment._id)
        track(person,post.category,'positiveComment',time+20000)
        notify(post.publisher,person._id,'Post','createComment',post._id,time+20000)
        if(parent) notify(parent.user,person._id,'Comment','replyComment',post._id,time+20000)
    }else if(again<0.4&&post.comments.length){
        // reads the comments, and likes or dislikes one of them
        track(person,post.category,'viewComments',time+5000)
        const comment=pick(comments.filter(c=>c.postId===post._id))
        const fresh=comment.user!==person._id&&!comment.likedBy.includes(person._id)&&!comment.dislikedBy.includes(person._id)
        const disagrees=content.DISAGREE.includes(comment.content)
        if(fresh&&chance(disagrees?0.35:0.1)){
            comment.dislikedBy.push(person._id)
            track(person,post.category,'dislikePositiveComment',time+15000)
        }else if(fresh&&chance(0.55)){
            comment.likedBy.push(person._id)
            person.commentsLiked.push(comment._id)
            track(person,post.category,'likePositiveComment',time+15000)
            notify(comment.user,person._id,'Comment','likeComment',post._id,time+15000)
        }
    }else if(again>0.965&&love>0.4&&post.appeal>0.8&&!post.community.communityId&&!post.sharedPost.post&&!post.shares.some(s=>s.user===person._id)){
        const share=addPost(person,post.category,pick(content.SHARE_NOTES),time+30000,{shared:post})
        post.shares.push({user:person._id,post:share._id})
        track(person,post.category,'sharePost',time+30000)
        notify(post.publisher,person._id,'Post','sharedPost',share._id,time+30000)
    }
    // following the author of a post you liked
    const author=post.author
    if(love>0.6&&!person.followes.includes(author._id)&&chance(0.22)){
        person.followes.push(author._id)
        author.followers.push(person._id)
        notify(author._id,person._id,'User','followUser',person._id,time+40000)
    }
}
function approve({community,person,time}){
    if(time>END-1.5*DAY) return                  // the latest requests are still waiting, so there is something to approve
    community.waitingList=community.waitingList.filter(w=>w.person!==person)
    community.members.push({person,joinedAt:new Date(time)})
    person.communities.find(c=>c.communityId===community._id).approved=true
    track(person,community.category,'joinCommunity',time)
}
events.pending=[]
for (let i = 0; i < events.length; i++) {
    // approvals that are due come first
    events.pending.sort((a,b)=>a.time-b.time)
    while(events.pending.length&&events.pending[0].time<=events[i].time) approve(events.pending.shift())
    play(events[i])
}
events.pending.sort((a,b)=>a.time-b.time).forEach(approve)
// something to do for managers and admins: two open requests in every private community
// and one post that waits for approval where posts need approval
communities.forEach(community=>{
    if(!community.public)
        people.filter(p=>active(p)&&!community.members.some(m=>m.person===p)&&!community.waitingList.some(w=>w.person===p))
            .sort((a,b)=>affinity(b,community.category,END)-affinity(a,community.category,END)).slice(0,2).forEach((person,i)=>{
                const time=END-between(2,30)*HOUR
                community.waitingList.push({person,askedAt:new Date(time)})
                person.communities.push({communityId:community._id,approved:false})
                notify(community.manager._id,person._id,'Community','membershipRequest',community._id,time)
            })
    if(community.postApproval){
        const member=community.members.map(m=>m.person).find(p=>p!==community.manager&&!community.admins.includes(p))
        if(member){
            const post=addPost(member,community.category,'Is anyone else joining the meetup next week? I can bring the projector.',END-between(1,12)*HOUR,{community})
            community.posts.push({post,approved:false})
        }
    }
})
// two trusted members of every bigger community become admins
communities.forEach(community=>{
    community.members.filter(m=>m.person!==community.manager).slice(0,community.members.length>5?2:1).forEach(({person})=>{
        community.admins.push(person)
        person.adminedCommunities.push(community._id)
        notify(person._id,community.manager._id,'Community','addedAdmin',community._id,community.createdAt.getTime()+3*DAY)
    })
})

// ---------------------------------------------------------------- direct messages
// people who follow each other chat about a topic they both like; the newest messages to the
// six demo accounts stay unread, so the messages badge has something to show
const messages=[]
const chatted=new Set()
people.filter(active).forEach(person=>{
    const friends=people.filter(other=>other!==person&&active(other)&&person.followes.includes(other._id)&&other.followes.includes(person._id))
    friends.slice(0,2).forEach((friend,n)=>{
        const key=[person.index,friend.index].sort().join('-')
        if(chatted.has(key)) return
        chatted.add(key)
        const topic=CATEGORIES.slice().sort((a,b)=>(affinity(person,b,END)+affinity(friend,b,END))-(affinity(person,a,END)+affinity(friend,a,END)))[0]
        const lines=content.CHATS[topic][(person.index*7+friend.index*3+n)%content.CHATS[topic].length]
        let time=END-between(0.1,6)*DAY
        lines.forEach((text,i)=>{
            const from=i%2?friend:person, to=i%2?person:friend
            time+=between(1,25)*MINUTE
            const recent=time>END-2*DAY&&to.index<6&&i===lines.length-1
            messages.push({_id:newId(),from:from._id,to:to._id,text,readAt:recent?null:new Date(time+between(2,60)*MINUTE),createdAt:new Date(time),updatedAt:new Date(time)})
        })
    })
})

// ---------------------------------------------------------------- write it all
function saveFile(folder,name,text){
    fs.mkdirSync(folder,{recursive:true})
    const fileName=`${hex()}-${name}`
    fs.writeFileSync(path.join(folder,fileName),text)
    return fileName
}
// createdAt is set by hand; this makes sure mongoose did not replace it with today
async function keepDates(Model,docs){
    await Model.collection.bulkWrite(docs.map(doc=>({updateOne:{filter:{_id:doc._id},update:{$set:{createdAt:doc.createdAt,updatedAt:doc.updatedAt||doc.createdAt}}}})))
}
async function main(){
    if(!process.env.DATABASE_URL){
        console.log('DATABASE_URL is missing. Put it in server/.env (see .env.example).')
        process.exit(1)
    }
    await mongoose.connect(process.env.DATABASE_URL)
    const existing=await User.countDocuments()+await Post.countDocuments()
    if(existing&&!process.argv.includes('--reset')){
        console.log(`The database already has data (${existing} users and posts).`)
        console.log('Run "npm run seed:reset" to DELETE everything in it and load the demo data.')
        await mongoose.disconnect()
        process.exit(1)
    }
    if(process.argv.includes('--reset')){
        for (const Model of [User,Post,Comment,Community,Notification,Message,FeedLog]) await Model.deleteMany({})
        fs.rmSync(UPLOADS,{recursive:true,force:true})
        console.log('old data deleted')
    }

    console.log('creating accounts ...')
    const userDocs=[]
    for (const p of people) {
        const folder=path.join(UPLOADS,'users-images',String(p._id))
        userDocs.push({
            _id:p._id,firstName:p.first,lastName:p.last,age:p.age,email:p.email,job:p.job,
            password:await bcrypt.hash(p.plainPassword,10),
            address:{country:p.country,city:p.city},
            profileImage:{imageName:saveFile(path.join(folder,'user-profile-image'),'avatar.svg',images.avatar(rng)),style:{top:'',scale:''}},
            coverImage:{imageName:saveFile(path.join(folder,'user-cover-image'),'cover.svg',images.cover(rng)),style:{top:'',scale:''}},
            interests:p.history,
            demo:true,demoStory:p.story||undefined,demoTimeAt:new Date(NOW),
            posts:p.posts,postsLiked:p.postsLiked,comments:p.comments,commentsLiked:p.commentsLiked,
            followers:p.followers,followes:p.followes,communities:p.communities,
            managedCommunities:p.managedCommunities,adminedCommunities:p.adminedCommunities,
            createdAt:new Date(p.createdAt),updatedAt:new Date(p.createdAt),
        })
    }
    await User.insertMany(userDocs)
    await keepDates(User,userDocs)

    console.log('creating posts and pictures ...')
    const postDocs=posts.map(post=>{
        const folder=path.join(UPLOADS,'posts-files',String(post._id))
        fs.mkdirSync(folder,{recursive:true})          // the server expects a folder for every post
        const files=[]
        for (let i = 0; i < post.pictures; i++) files.push({fileName:saveFile(folder,`${post.category}-${i+1}.svg`,images.postImage(post.category,rng))})
        const {author,pictures,...doc}=post
        return {...doc,files,updatedAt:post.createdAt}
    })
    await Post.insertMany(postDocs)
    await keepDates(Post,postDocs)

    const commentDocs=comments.map(c=>({...c,updatedAt:c.createdAt}))
    await Comment.insertMany(commentDocs)
    await keepDates(Comment,commentDocs)

    const communityDocs=communities.map(c=>({
        _id:c._id,communityName:c.name,describtion:c.describtion,category:c.category,public:c.public,postApproval:c.postApproval,
        manager:c.manager._id,admins:c.admins.map(a=>a._id),
        members:c.members.map(m=>({memberId:m.person._id,joinedAt:m.joinedAt})),
        waitingList:c.waitingList.map(w=>({userId:w.person._id,askedAt:w.askedAt})),
        posts:c.posts.map(p=>({postId:p.post._id,approved:p.approved})),
        coverImageName:saveFile(path.join(UPLOADS,'communities-images',String(c._id)),'cover.svg',images.cover(rng,c.category)),
        createdAt:c.createdAt,updatedAt:c.createdAt,
    }))
    await Community.insertMany(communityDocs)
    await keepDates(Community,communityDocs)

    await FeedLog.insertMany(feedLogs)
    await keepDates(FeedLog,feedLogs)
    await Message.insertMany(messages)
    await keepDates(Message,messages)

    const notificationDocs=notifications.map(n=>({...n,updatedAt:n.createdAt}))
    await Notification.insertMany(notificationDocs)
    await keepDates(Notification,notificationDocs)

    // a last check that the dates in the database are the ones from the story
    const oldest=await Post.findOne().sort({createdAt:1})
    if(Date.now()-oldest.createdAt.getTime()<DAY)
        console.log('WARNING: the post dates were not kept, tell me and I will look at it')

    const reactions=people.reduce((sum,p)=>sum+CATEGORIES.reduce((n,c)=>n+p.history[c].length-1,0),0)
    console.log(`\ndone: ${people.length} people, ${posts.length} posts, ${comments.length} comments, ${communities.length} communities, ${notifications.length} notifications, ${messages.length} messages, ${feedLogs.length} feed pages, ${reactions} tracked actions over ${DAYS} days\n`)
    const roleOf=p=>communities.filter(c=>c.manager===p).map(c=>`manager of ${c.name}`).concat(communities.filter(c=>c.admins.includes(p)).map(c=>`admin of ${c.name}`)).join(', ')
    const rows=people.map(p=>({name:`${p.first} ${p.last}`,email:p.email,password:p.plainPassword,about:p.story||p.job,roles:roleOf(p)}))
    console.table(rows.slice(0,6).map(({roles,...row})=>row))
    const file=path.join(__dirname,'..','SEED-ACCOUNTS.md')
    fs.writeFileSync(file,'# Demo accounts\n\nCreated by `npm run seed`. All of this is made-up data.\n\n| Name | Email | Password | About | Community roles |\n|---|---|---|---|---|\n'+rows.map(r=>`| ${r.name} | ${r.email} | \`${r.password}\` | ${r.about} | ${r.roles} |`).join('\n')+'\n')
    console.log(`all ${people.length} accounts with their passwords are in ${file}`)
    // when this seed ran (the server uses it to know when the demo needs a fresh copy, see middleware/demoMode.js)
    fs.mkdirSync(UPLOADS,{recursive:true})
    fs.writeFileSync(path.join(UPLOADS,'.seeded-at'),new Date().toISOString())
    await mongoose.disconnect()
}
if(require.main===module)
    main().catch(err=>{console.log(err);process.exit(1)})
module.exports={people,posts,comments,communities,notifications}
