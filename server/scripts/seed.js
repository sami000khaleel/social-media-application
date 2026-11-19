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
// [CHANGED] not used any more: picture names come from the seed's own random numbers (see saveImage)
// const hex=()=>crypto.randomBytes(8).toString('hex')

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
// [NEW] the posts each person already looked at (seen) and reacted to (touched)
people.forEach(p=>{p.seen=new Set();p.touched=new Set()})
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
        // [REMOVED] "appeal" (a few posts took off and got most reactions): every post now gets the same, see EACH_POST
        // appeal:chance(0.12)?between(2.2,4.5):between(0.35,1.4),
        // [NEW] some posts split opinions: their comment and dislike come from people who disagree
        controversial:chance(category==='politics'||category==='business'?0.3:0.1),
        // [NEW] what this post got so far (see EACH_POST)
        got:{like:0,comment:0,reply:0,dislike:0},
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
// [CHANGED] every topic gets its posts evenly over the five weeks (one every 20 hours or so), in the hours
// people are online. Before, the times were random, so one week could have 3 tech posts and the next 12.
// The last post is 6.5 hours before the end, so every post has time to get all its reactions (EACH_POST).
const LAST_POST=END-6.5*HOUR
CATEGORIES.forEach(category=>{
    const list=content.POSTS[category]
    list.forEach(([text,picture],i)=>{
        const day=Math.floor(0.3+(i+between(0.2,0.8))/list.length*(DAYS-0.6))
        let time=momentOn(day)
        if(time>LAST_POST) time=LAST_POST-between(0,3)*HOUR
        events.push({type:'post',time,category,text,picture})
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
        // [NEW] ten people who like the topic join in the first days (people without a story), so every
        // community has enough members to give its posts the same reactions as all other posts
        fillers().filter(p=>p!==manager).sort((a,b)=>affinity(b,spec.category,time)-affinity(a,spec.category,time)+rng()*0.3-0.15)
            .slice(0,10).forEach(person=>events.pending.push({type:'join',time:time+between(0.1,3)*DAY,community,person}))
        return
    }
    if(event.type==='post'){
        // [CHANGED] somebody who likes the topic, and people who have written less so far go first,
        // so everybody ends up with about the same number of posts (before: from 2 to 22)
        const writers=people.filter(p=>active(p)&&p.createdAt<time&&!(p.quietDays&&time>END-p.quietDays*DAY))
        const fewest=Math.min(...writers.map(p=>p.posts.length))
        // nobody writes about a topic they dislike, and the story people only about topics they really like
        const fits=p=>p.dislikes!==event.category&&(!isStory(p)||affinity(p,event.category,time)>=0.5)
        const author=weightedPick(writers.filter(fits),p=>(0.03+affinity(p,event.category,time)**2)*0.4**(p.posts.length-fewest))
        const post=addPost(author,event.category,event.text,time,{picture:event.picture})
        track(author,event.category,'createPost',time)
        scheduleFill(post,time)
        // [NEW] the story people see new posts about their favourite topic within a few hours (as if they
        // followed the topic), so their favourite topic is always clearly in front in their feed. They also
        // see the posts of their second topic and like most of them, so their feed has a bit of that too.
        people.filter(p=>active(p)&&isStory(p)&&p!==author&&!(p.quietDays&&time>END-p.quietDays*DAY)).forEach(person=>{
            const second=affinity(person,event.category,time)<0.7&&secondTopic(person,time)===event.category
            if(affinity(person,event.category,time)>=0.7||second)
                events.pending.push({type:'look',time:Math.min(time+between(0.5,6)*HOUR,END-HOUR),person,post,second})
        })
        return
    }
    const {person}=event
    const roll=rng()
    // sometimes: something in a community
    if(roll<0.10&&communities.length){
        const community=weightedPick(communities,c=>0.05+affinity(person,c.category,time)**2)
        const isMember=community.members.some(m=>m.person===person)
        const waiting=community.waitingList.some(w=>w.person===person)
        // [CHANGED] people join from a smaller interest on (was 0.5), so every community has enough members
        // to give its posts the same reactions as all other posts (the story people only for a topic they
        // really like, so their story stays clear)
        if(!isMember&&affinity(person,community.category,time)>(isStory(person)?0.6:0.25)){
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
        }else if(isMember&&community.manager!==person&&!community.admins.includes(person)&&(affinity(person,community.category,time)<0.25&&chance(0.3)||chance(0.02))){
            // [NEW] lost interest: leaves the community (their posts there stay)
            community.members=community.members.filter(m=>m.person!==person)
            person.communities=person.communities.filter(c=>c.communityId!==community._id)
            track(person,community.category,'leaveCommunity',time)
        }else if(isMember){
            const texts=content.COMMUNITY_POSTS[community.name]
            const unused=texts.filter(t=>!community.posts.some(p=>p.post.describtion===t))
            if(unused.length&&chance(0.5)&&time<END-6*HOUR){
                const post=addPost(person,community.category,unused[0],time,{community})
                const isStaff=community.manager===person||community.admins.includes(person)
                const approved=!community.postApproval||isStaff||time<END-2*DAY
                community.posts.push({post,approved})
                // [NEW] a post that waits for approval is not seen by the members yet
                post.waiting=!approved
                if(approved) scheduleFill(post,time)
            }else if(community.public||isMember)
                track(person,community.category,'viewCommunity',time)
        }
        return
    }
    // [CHANGED] otherwise: look at a post and react to it (see "how people pick a post" below)
    // [NEW] now and then (1 action in 70): takes back a like from the last three days
    if(roll<0.115&&takeBack(person,time)) return
    const post=pickPost(person,time)
    if(post) react(person,post,time)
}

// ---------------------------------------------------------------- [CHANGED] how people pick a post and react to it
// Rewritten so interactions are spread 100% evenly:
//   - every post gets exactly the same reactions: 6 likes, 2 comments, 1 reply and 1 dislike (EACH_POST).
//     Before, a few popular posts took most of the reactions and some posts got none.
//   - so every topic gets exactly the same too
//   - people react to every topic (before: 70-80% of a person's reactions were about one topic). The four
//     story people still have a favourite topic in front, or their feed would have no story to show.
//   - the reactions on comments are spread the same way: always the comment with the least so far
const EACH_POST={like:6,comment:2,reply:1,dislike:1}
const EACH_COMMENT=2                                           // reactions on every comment and reply
const QUOTA=Object.values(EACH_POST).reduce((a,b)=>a+b,0)       // 10 reactions per post
const SHARES=30                                                // shares in total: 6 per topic, never two of the same post
const FOLLOWERS=7                                              // followers of every person (see the end of the story)
const room=(post,kind)=>EACH_POST[kind]-post.got[kind]
const total=post=>post.got.like+post.got.comment+post.got.reply+post.got.dislike
const full=post=>total(post)>=QUOTA
// in their sessions the people without a story give a post at most this much, so the story people find
// room on new posts too; the top-up about a day later (fill) brings every post to exactly EACH_POST
const IN_SESSION={like:3,comment:1,reply:1,dislike:1}
const sessionRoom=post=>Object.keys(IN_SESSION).some(kind=>post.got[kind]<IN_SESSION[kind])
const isStory=person=>Boolean(person.story)
const fillers=()=>people.filter(p=>active(p)&&!isStory(p))
// [NEW] a story person's second topic: the one they like most after their favourite (none when it is
// below 0.15, like for Sophie, who has two favourites)
function secondTopic(person,time){
    const rest=CATEGORIES.filter(c=>c!==person.dislikes&&affinity(person,c,time)<0.7&&affinity(person,c,time)>=0.15)
    return rest.sort((a,b)=>affinity(person,b,time)-affinity(person,a,time))[0]
}
// how much a person wants posts of a topic (never 0, so everybody sees every topic now and then)
function pull(person,category,time){
    if(person.dislikes===category) return 0.06          // sees it now and then, and dislikes it
    const love=affinity(person,category,time)
    // the four story people: their favourite topic gets about half of their reactions
    if(isStory(person)) return 0.15+love**1.5
    return 0.3+1.2*love**2
}
// the post is there for this person (not their own, not too old, in a community they are a member of)
const canReach=(person,post,time)=>post.author!==person&&!post.waiting&&post.createdAt.getTime()<time
    &&time-post.createdAt.getTime()<9*DAY
    &&(!post.community.communityId||communities.find(c=>c._id===post.community.communityId).members.some(m=>m.person===person))
// ... and they have not looked at it yet
const canSee=(person,post,time)=>canReach(person,post,time)&&!person.seen.has(post)
function pickPost(person,time){
    const story=isStory(person)
    let candidates=posts.filter(p=>canSee(person,p,time)&&(story?!full(p):sessionRoom(p)))
    // [CHANGED] 4 times out of 10 (was 3 out of 4) the post comes from the page the feed just sent:
    // the feed still shapes what people see, but no longer locks them into one topic
    if(person.lastFeed&&time-person.lastFeed.time<2*HOUR&&chance(0.4)){
        const fromFeed=candidates.filter(p=>person.lastFeed.ids.has(String(p._id)))
        if(fromFeed.length) candidates=fromFeed
    }
    if(!candidates.length) return null
    // the story people follow their own taste, newer posts first
    if(story) return weightedPick(candidates,p=>pull(person,p.category,time)/(1+(time-p.createdAt.getTime())/(2*DAY)))
    // everybody else takes one of the posts with the fewest reactions (their taste decides which one)
    const least=Math.min(...candidates.map(total))
    return weightedPick(candidates.filter(p=>total(p)===least),p=>pull(person,p.category,time))
}
// a text nobody has used under this post yet (falls back to any text when all are used)
function freshText(list,under){
    const unused=list.filter(text=>!under.some(c=>c.content===text))
    return pick(unused.length?unused:list)
}
// the one that has had the least attention so far (ties: by chance)
const leastOf=(list,count)=>list.map(x=>[x,count(x),rng()]).sort((a,b)=>a[1]-b[1]||a[2]-b[2])[0][0]

// one person stops at one post. "always" (the top-up): they react for sure, with what the post still needs
// only: the kinds of reaction allowed, pass: how often they scroll on instead (overrides the usual)
function react(person,post,time,{always=false,only=null,pass:passing=null}={}){
    person.seen.add(post)
    const love=affinity(person,post.category,time)
    const hates=person.dislikes===post.category
    const under=()=>comments.filter(c=>c.postId===post._id)
    const others=under().filter(c=>c.user!==person._id)
    // 1. one reaction. Which kind depends on how much they like the topic and whether the post splits
    //    opinions. Sometimes they just read it and scroll on ("pass"): more often for topics they do not
    //    care about (the story people even more, so their favourite topic stays in front).
    const story=isStory(person)
    const wants={
        like:hates?0:0.3+0.55*love,
        comment:hates?0:0.1+0.08*love,
        reply:hates||!others.length?0:0.12,
        dislike:hates?1:love<0.35?0.18+(post.controversial?0.1:0):(story?0.03:0.05)+(post.controversial?0.05:0),
    }
    const pass=always?0:passing!==null?passing:story?0.15+2.4*(1-love)**2:0.2+0.9*(1-love)**2
    // the story people react the way they like; when the post has no room left for that, they scroll on
    // (never a reaction they would not choose, which would blur their story).
    // Everybody else picks among the kinds the post still has room for (in a session: see IN_SESSION).
    const cap=kind=>always||story?EACH_POST[kind]:IN_SESSION[kind]
    const kinds=Object.keys(wants).filter(kind=>wants[kind]>0&&(story||post.got[kind]<cap(kind))&&(!only||only.includes(kind)))
    if(!kinds.length) return
    const kind=weightedPick(kinds.concat('pass'),k=>k==='pass'?pass:wants[k])
    if(kind==='pass'||post.got[kind]>=cap(kind)) return
    post.got[kind]++
    person.touched.add(post)
    if(kind==='like'){
        post.likes.push(person._id)
        person.postsLiked.push(post._id)
        track(person,post.category,'likePost',time)
        notify(post.publisher,person._id,'Post','likePost',post._id,time)
    }else if(kind==='dislike'){
        post.dislikes.push(person._id)
        track(person,post.category,'dislikePost',time)
        if(hates) return                    // a topic they dislike: nothing more (no comments, no follow)
    }else if(kind==='comment'){
        // people who do not care much for the topic, or a post that splits opinions: a polite disagreement
        const against=post.controversial?chance(0.5):chance(love<0.35?0.3:0.05)
        addComment(person,post,freshText(against?content.DISAGREE:content.COMMENTS[post.category],under()),null,time+20000)
    }else if(kind==='reply'){
        track(person,post.category,'viewComments',time+5000)
        addComment(person,post,freshText(content.REPLIES,under()),leastOf(others,c=>c.repliedBy.length),time+35000)
    }
    if(always) return
    // 2. reading the comments now and then: a reaction on the comment with the least so far
    //    (every comment gets exactly EACH_COMMENT, the top-up gives the rest)
    const open=others.filter(c=>canReactTo(person,c))
    if(open.length&&chance(0.35))
        reactToComment(person,post,leastOf(open,c=>c.likedBy.length+c.dislikedBy.length),time)
    // 3. now and then a share (never two of the same post)
    const shares=posts.filter(p=>p.sharedPost.post&&p.category===post.category).length
    if(kind==='like'&&love>0.45&&shares<SHARES/CATEGORIES.length&&!post.shares.length&&chance(0.15)&&time<END-6*HOUR&&!post.community.communityId&&!post.sharedPost.post){
        const share=addPost(person,post.category,pick(content.SHARE_NOTES),time+30000,{shared:post})
        post.shares.push({user:person._id,post:share._id})
        track(person,post.category,'sharePost',time+30000)
        notify(post.publisher,person._id,'Post','sharedPost',share._id,time+30000)
        scheduleFill(share,time+30000)
    }
    // 4. following the author of a post they liked, until everybody has 7 followers (so followers are even too)
    const author=post.author
    if(kind==='like'&&love>0.4&&!person.followes.includes(author._id)&&author.followers.length<FOLLOWERS&&chance(0.3)){
        person.followes.push(author._id)
        author.followers.push(person._id)
        notify(author._id,person._id,'User','followUser',person._id,time+40000)
    }
}
const canReactTo=(person,comment)=>comment.user!==person._id&&!comment.likedBy.includes(person._id)&&!comment.dislikedBy.includes(person._id)
    &&comment.likedBy.length+comment.dislikedBy.length<EACH_COMMENT
// a like, or a dislike for a comment that disagrees and has none yet (so it gets one of each)
function reactToComment(person,post,comment,time){
    track(person,post.category,'viewComments',time+5000)
    if(content.DISAGREE.includes(comment.content)&&!comment.dislikedBy.length){
        comment.dislikedBy.push(person._id)
        track(person,post.category,'dislikePositiveComment',time+15000)
    }else{
        comment.likedBy.push(person._id)
        person.commentsLiked.push(comment._id)
        track(person,post.category,'likePositiveComment',time+15000)
        notify(comment.user,person._id,'Comment','likeComment',post._id,time+15000)
    }
}
function addComment(person,post,text,parent,time){
    const comment={_id:newId(),user:person._id,postId:post._id,content:text,
        repliedTo:parent?String(parent._id):null,repliedBy:[],likedBy:[],dislikedBy:[],badComment:false,positivity:true,createdAt:new Date(time)}
    comments.push(comment)
    post.comments.push(comment._id)
    person.comments.push(comment._id)
    if(parent) parent.repliedBy.push(comment._id)
    track(person,post.category,'positiveComment',time)
    notify(post.publisher,person._id,'Post','createComment',post._id,time)
    if(parent) notify(parent.user,person._id,'Comment','replyComment',post._id,time)
}
// [NEW] the top-up: about a day after a post went up, people who have not seen it yet bring it to exactly
// EACH_POST, and every comment under it to EACH_COMMENT
function scheduleFill(post,time){
    events.pending.push({type:'fill',time:Math.min(time+between(20,30)*HOUR,END-3*HOUR),post})
}
function fill({post,time}){
    let t=time
    const quiet=p=>p.quietDays&&t>END-p.quietDays*DAY
    // people with fewer reactions so far go first, so the top-up is spread over everybody
    // (only the people without a story: the story people's activity is their story)
    const queue=fillers().filter(p=>!quiet(p)).map(p=>[p,p.seen.size+rng()*4]).sort((a,b)=>a[1]-b[1]).map(([p])=>p)
    // first everybody who has not reacted yet (also people who scrolled past it before: they come back to it),
    // then, when that is not enough (a small community), people who liked it also write a comment or a reply
    for (const round of [1,2]) {
        for (const person of queue) {
            if(full(post)) break
            if(!canReach(person,post,t)) continue
            const reacted=person.touched.has(post)
            const wrote=comments.some(c=>c.postId===post._id&&c.user===person._id)
            if(round===1?reacted:!reacted||wrote) continue
            react(person,post,t,{always:true,only:round===1?null:['comment','reply']})
            t+=between(2,9)*MINUTE
        }
    }
    for (const comment of comments.filter(c=>c.postId===post._id)) {
        for (const person of queue) {
            if(comment.likedBy.length+comment.dislikedBy.length>=EACH_COMMENT) break
            if(!canReactTo(person,comment)||!canReach(person,post,t)) continue
            reactToComment(person,post,comment,Math.max(t,comment.createdAt.getTime()+MINUTE))
            t+=between(1,5)*MINUTE
        }
    }
    // shares are even too: exactly 6 per topic. A topic that is behind gets one here, from somebody who liked the post
    const sharesOf=category=>posts.filter(p=>p.sharedPost.post&&p.category===category).length
    if(!post.community.communityId&&!post.sharedPost.post&&!post.shares.length&&sharesOf(post.category)<SHARES/CATEGORIES.length&&t<END-7*HOUR&&chance(0.3)){
        const sharer=queue.find(p=>post.likes.includes(p._id))
        if(sharer){
            const share=addPost(sharer,post.category,pick(content.SHARE_NOTES),t,{shared:post})
            post.shares.push({user:sharer._id,post:share._id})
            track(sharer,post.category,'sharePost',t)
            notify(post.publisher,sharer._id,'Post','sharedPost',share._id,t)
            scheduleFill(share,t)
        }
    }
    // a community post with too few members so far: again a day later (new members may have joined)
    if(!full(post)&&time+DAY<Math.min(post.createdAt.getTime()+8*DAY,END-3*HOUR))
        events.pending.push({type:'fill',time:time+DAY,post})
}
// [NEW] changed their mind: takes back a like on a post from the last 4 hours (the top-up later gives
// the post its sixth like back from somebody else)
function takeBack(person,time){
    const recent=posts.filter(p=>p.likes.includes(person._id)&&time-p.createdAt.getTime()<4*HOUR)
    if(!recent.length) return false
    const post=pick(recent)
    post.likes=post.likes.filter(id=>id!==person._id)
    person.postsLiked=person.postsLiked.filter(id=>id!==post._id)
    post.got.like--
    track(person,post.category,'unlikePost',time)
    return true
}
function approve({community,person,time}){
    if(time>END-1.5*DAY) return                  // the latest requests are still waiting, so there is something to approve
    community.waitingList=community.waitingList.filter(w=>w.person!==person)
    community.members.push({person,joinedAt:new Date(time)})
    person.communities.find(c=>c.communityId===community._id).approved=true
    track(person,community.category,'joinCommunity',time)
}
events.pending=[]
// [NEW] things that wait for their time: join approvals, founding members (join), top-ups (fill) and the
// story people's look at a new post about their favourite topic (look)
const runPending=item=>item.type==='fill'?fill(item):item.type==='join'?join(item):item.type==='look'?look(item):approve(item)
function look({person,post,time,second}){
    if(canSee(person,post,time)&&!full(post)) react(person,post,time,second?{only:['like'],pass:0.8}:{})
}
// [NEW] a founding member joins (a private community: the manager invited them, so no request)
function join({community,person,time}){
    if(community.members.some(m=>m.person===person)||community.waitingList.some(w=>w.person===person)) return
    community.members.push({person,joinedAt:new Date(time)})
    person.communities.push({communityId:community._id,approved:true})
    track(person,community.category,'joinCommunity',time)
}
for (let i = 0; i < events.length; i++) {
    // approvals that are due come first
    events.pending.sort((a,b)=>a.time-b.time)
    while(events.pending.length&&events.pending[0].time<=events[i].time) runPending(events.pending.shift())
    play(events[i])
}
events.pending.sort((a,b)=>a.time-b.time).forEach(item=>runPending(item))
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
            post.waiting=true
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

// [NEW] followers spread evenly too: everybody ends up with exactly FOLLOWERS (7) followers. Missing ones come
// from people who liked their posts (the most likes first), a little after the last of those likes.
people.filter(active).forEach(author=>{
    const likedBy=people.filter(p=>p!==author&&active(p)&&!p.followes.includes(author._id))
        .map(p=>[p,posts.filter(x=>x.author===author&&x.likes.includes(p._id))]).filter(([,liked])=>liked.length)
        .sort((a,b)=>b[1].length-a[1].length||rng()-0.5)
    for (const [person,liked] of likedBy) {
        if(author.followers.length>=FOLLOWERS) break
        const time=Math.min(liked[liked.length-1].createdAt.getTime()+between(2,20)*HOUR,END-between(1,5)*HOUR)
        person.followes.push(author._id)
        author.followers.push(person._id)
        notify(author._id,person._id,'User','followUser',person._id,time)
    }
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
// [CHANGED] a picture is drawn from its own file name (see seed-images.js fromName), so the server can draw
// it again when the file is gone from the disk
// function saveFile(folder,name,text){
//     fs.mkdirSync(folder,{recursive:true})
//     const fileName=`${hex()}-${name}`
//     fs.writeFileSync(path.join(folder,fileName),text)
//     return fileName
// }
function saveImage(folder,kind){
    fs.mkdirSync(folder,{recursive:true})
    const code=Array.from({length:16},()=>Math.floor(rng()*16).toString(16)).join('')
    const fileName=`${code}-${kind}.svg`
    fs.writeFileSync(path.join(folder,fileName),images.fromName(fileName))
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
            profileImage:{imageName:saveImage(path.join(folder,'user-profile-image'),'avatar'),style:{top:'',scale:''}},
            coverImage:{imageName:saveImage(path.join(folder,'user-cover-image'),'cover'),style:{top:'',scale:''}},
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
        for (let i = 0; i < post.pictures; i++) files.push({fileName:saveImage(folder,`${post.category}-${i+1}`)})
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
        coverImageName:saveImage(path.join(UPLOADS,'communities-images',String(c._id)),`cover-${c.category}`),
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
