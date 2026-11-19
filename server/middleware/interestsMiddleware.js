// ============================================================================================
// [CHANGED] This file was reworked. Every change is tagged [FIX] / [CHANGED] / [NEW] below,
// and the original updateScore and calcInterests are kept, commented out, at the bottom.
// The idea of the algorithm is unchanged:
//   every action adds a point (score,date) to the history of one interest,
//   scores decay by 2 points a day, and the feed is split by how fast each score rises (its derivative).
// ============================================================================================
const User=require('../models/userSchema.js')
// [NEW] sends the new point to the user's open tabs over Socket.IO (live feed mix, live charts)
const realtime=require('../realtime.js')

// [NEW] the interests every user has a score history for (the keys of userSchema.interests)
const CATEGORIES=['business','tech','entertainment','sport','politics']
// [NEW] named constants for numbers that were written inside the functions
// a score moves this many points back towards zero for every full day without activity
const DECAY_PER_DAY=2
// how far back the derivative looks:
// first the last 5 minutes (what the user is doing right now, as before),
// [NEW] and when nothing happened in that time the last 7 days (what the user has been into lately)
// [CHANGED] two windows, and each one decides half of every page (see calcMix):
// session = what you are doing right now (was 5 minutes, "momentum"), week = what you have been into lately ("trend")
const WINDOWS={
    session:{amount:30,unit:'minute'},
    week:{amount:7,unit:'day'}
}
// how many points every action is worth
// [CHANGED] moved out of updateScore so the seed script uses exactly the same numbers
const actionsScores={
    undislikeNegativeComment:-3,
    dislikeNegativeComment:3,
    undislikePositiveComment:3,
    dislikePositiveComment:-3,
    dislikePost:-4,
    undislikePost:6,
    messages:6,
    deleteCommunity:-17,
    viewCommunity:6,
    viewComments:3,
    // [FIX] was "unLikePost", but the routes send "unlikePost": the score was undefined and NaN was saved
    unlikePost:-5,
    sharePost:20,
    createPost:15,
    negativeComment:-5,
    positiveComment:5,
    // [FIX] createCommunity was in this list twice (10 and 50); in JavaScript the last one wins, so 10 was never used
    // createCommunity:10,
    deletePost:-6,
    deleteNegativeComment:2,
    deletePositiveComment:-2,
    likePost:3,
    likeNegativeComment:-2,
    likePositiveComment:2,
    unlikeNegativeComment:2,
    unlikePositiveComment:-2,
    joinCommunity:22,
    leaveCommunity:-14,
    createCommunity:50,
    seePostWithDuration1:3,
    seePostWithDuration2:6,
    seePostWithDuration3:9,
}

// takes the last point of a score history and returns that point moved to currentTime
// with the time decay applied
// [CHANGED] currentTime can be passed in (the seed script replays the past with it)
// [FIX] the decay stops at zero: a score of 3 after 5 days was -7, so an old like turned into a dislike
function calcNewLast(p,currentTime=new Date()){
    let newScore=p.score
    const diffTime = Math.abs(currentTime - p.date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // if(p.score>=0)
    //  newScore=p.score-2*diffDays
    //  if(p.score<0)
    //  newScore=p.score+2*diffDays
    if(p.score>0)
        newScore=Math.max(0,p.score-DECAY_PER_DAY*diffDays)
    if(p.score<0)
        newScore=Math.min(0,p.score+DECAY_PER_DAY*diffDays)

    const newLast={score:newScore,date:currentTime}
    return newLast
}
function subtractTimeFromDate(date, amount, unit) {
    const unitsInMilliseconds = {
      'hour': 60 * 60 * 1000,
      'minute': 60 * 1000,
      'second': 1000,
      'day': 24 * 60 * 60 * 1000
    };

    const amountInMilliseconds = amount * unitsInMilliseconds[unit];
    const newDate = new Date(date.getTime() - amountInMilliseconds);

    return newDate;
}
// [CHANGED] removed console.log lines from the helpers below
// [CHANGED] calcLine and getDerivative were unused (getDerivative used an undefined variable "data").
// Kept, commented out:
// function calcLine(y2,y1,x2,x1,xi){
//     const m=(y2-y1)/(x2-x1)
//     const b=y2-m*x2
//     const yi=m*xi+b
//     return xi
// }
// function getDerivative(days,hours,minutes,seconds){
//     data=data.map(obj=>({score:obj.score,date:obj.date.getTime()}))
//     const scores=data.map(({score})=>score)
//     const times=data.map(({date})=>date)
// }

// linear interpolation: the point at xi on the line between (x1,y1) and (x2,y2)
function calcPoint(y2,x2,y1,x1,xi){
    if(xi>x2)
        {
            console.log('xi is bigger than x2 error')
            return
        }

        const deltaI=x2-xi
        const delta=x2-x1
        const diffX=(delta-deltaI)/delta
        const deltaY=y2-y1
        const yi=deltaY*diffX+y1

        const pi={xi,yi}
    return pi
}
// index of the last point that is not newer than wantedDate
function findValue(data,wantedDate){
    if(wantedDate.getTime()<data[0].date.getTime())
    return 0
    for (let i = data.length-1; i >= 0; i--)
    {
        let deltaDate=wantedDate.getTime()-data[i].date.getTime()
        if(deltaDate>=0)
            return i
    }
}
// [NEW] the derivative of ONE interest over one window, taken out of calcInterests so it can run twice
// (5 minutes, then 7 days). Returns the score now and the slope in points per second.
function calcDerivative(scoreFunction,window,now){
    if(!scoreFunction||scoreFunction.length===0)
        return {score:0,scoreThen:0,value:0}
    // [FIX] works on plain copies. The old code pushed the "now" point into user.interests,
    // so the next save of the user stored a fake point every time the feed was loaded.
    const points=scoreFunction.map(p=>({score:p.score,date:new Date(p.date)}))
    const newLastPoint=calcNewLast(points[points.length-1],now)
    points.push(newLastPoint)
    const wantedDate=subtractTimeFromDate(now,window.amount,window.unit)
    let scoreThen
    if(wantedDate.getTime()<=points[0].date.getTime())
        // [FIX] the history starts inside the window: start from its first score
        // (the old code read points[index+1] of a list with one point and crashed for new users)
        scoreThen=points[0].score
    else{
        const index=findValue(points,wantedDate)
        const pointI=calcPoint(points[index+1].score,points[index+1].date.getTime(),points[index].score,points[index].date.getTime(),wantedDate.getTime())
        scoreThen=pointI.yi
    }
    // [FIX] divided by (now - wantedDate), the length of the window. The old code divided by (now - pointI.xi),
    // which is the same number, so the result does not change; it is just clearer.
    const derivative=(newLastPoint.score-scoreThen)/(newLastPoint.date.getTime()-wantedDate.getTime())*1000
    // [NEW] scoreThen is returned too, so the client can show "from 120 to 190 in 7 days"
    return {score:newLastPoint.score,scoreThen,value:derivative}
}
// [NEW] the derivative of every interest over one window.
// An interest only gets a share of the feed (weight) while its score is positive AND rising.
// why: the old shares were value/sum of all values, so a falling score gave a NEGATIVE share,
// and when the values added up to 0 every share was NaN.
function calcDerivatives(user,window,now){
    return CATEGORIES.map(interest=>{
        const {score,scoreThen,value}=calcDerivative(user.interests[interest],window,now)
        // only a topic with points that is climbing counts: a falling topic (climb below zero) gets no posts
        // ([FIX] in the original, a negative slope still got a share, and .limit(negative) still sent posts)
        const weight=score>0&&value>0?value:0
        return {interest,score,scoreThen,value,weight}
    })
}
// the share of each topic in one half: its weight divided by the weight of all topics
function shares(derivatives){
    const totalSum=derivatives.reduce((sum,obj)=>sum+obj.weight,0)
    derivatives.forEach(obj=>obj.probability=totalSum?Number((obj.weight/totalSum).toFixed(3)):0)
    return derivatives
}
// [CHANGED] every page is made of two halves:
//   week    half: what the user has been into over the last 7 days
//   session half: what the user did in this session (the last 30 minutes)
// A half with nothing climbing falls back: the session half then follows the week, and a week without
// anything climbing is an even split between the topics the user does not dislike (score not below zero).
function calcMix(interests,now=new Date()){
    const holder={interests}
    const week={key:'week',basis:'week',window:WINDOWS.week,derivatives:calcDerivatives(holder,WINDOWS.week,now)}
    if(week.derivatives.every(obj=>obj.weight===0)){
        week.basis='even'
        const liked=week.derivatives.filter(obj=>obj.score>=0)
        ;(liked.length?liked:week.derivatives).forEach(obj=>obj.weight=1)
    }
    shares(week.derivatives)
    const session={key:'session',basis:'session',window:WINDOWS.session,derivatives:calcDerivatives(holder,WINDOWS.session,now)}
    if(session.derivatives.every(obj=>obj.weight===0)){
        // nothing in this session yet: this half uses the week's shares (its own numbers stay, for the table)
        session.basis='followsWeek'
        session.derivatives.forEach((obj,i)=>{obj.probability=week.derivatives[i].probability})
    }
    else
        shares(session.derivatives)
    // one row per topic for the whole page: the share is the average of the two halves
    const derivatives=CATEGORIES.map((interest,i)=>{
        const w=week.derivatives[i],t=session.derivatives[i]
        return {interest,score:w.score,scoreThen:w.scoreThen,value:w.value,
            sessionScoreThen:t.scoreThen,sessionValue:t.value,
            weight:w.weight+t.weight,probability:Number(((w.probability+t.probability)/2).toFixed(3))}
    })
    // the whole page: 'split' (both halves have their own signal), 'week' (nothing in this session) or 'even'
    const basis=session.basis==='session'?'split':week.basis
    return {basis,window:basis==='even'?null:WINDOWS.week,week,session,derivatives}
}
function allocate(derivatives,limit){
    const totalWeight=derivatives.reduce((sum,obj)=>sum+(obj.probability||0),0)
    let left=limit
    const exact=new Map()
    derivatives.forEach(obj=>{
        exact.set(obj,totalWeight?limit*(obj.probability||0)/totalWeight:0)
        obj.postsNumber=Math.floor(exact.get(obj))
        left-=obj.postsNumber
    })
    const byRemainder=derivatives.filter(obj=>obj.probability>0).sort((a,b)=>(exact.get(b)-b.postsNumber)-(exact.get(a)-a.postsNumber))
    for (let i = 0; i < left&&byRemainder.length; i++)
        byRemainder[i%byRemainder.length].postsNumber++
    return derivatives
}
// [NEW] the number of posts on one page of the feed (half of them for the week, half for this session)
const PAGE_SIZE=30
// [NEW] surprises: without them a feed that is 100% politics can only ever show politics, because you can only like
// what you are shown. So 1 post in 10 (3 of 30) goes to topics the page gave nothing, picked at random.
// [CHANGED] only topics that are not falling and not disliked can get one (climb not below zero in the week and in
// this session, score not below zero), so a falling topic never gets posts, not even as a surprise.
const SURPRISE_SHARE=0.1
// makes room for the surprises by taking them, one at a time, from the topic with the most posts on the page
// (out of the half that has more of it). Returns how many surprises the page gets.
function makeRoom(mix,limit){
    const {week,session,derivatives}=mix
    derivatives.forEach((obj,i)=>{
        obj.exploreNumber=0
        obj.postsNumber=week.derivatives[i].postsNumber+session.derivatives[i].postsNumber
        // rounded to whole points: the slow daily decay shows up as a tiny minus (−0.02) inside 30 minutes, which is not a real fall
        const notFalling=climb=>Math.round(climb)>=0
        obj.canSurprise=!obj.postsNumber&&obj.score>=0&&notFalling(obj.score-obj.scoreThen)&&notFalling(session.derivatives[i].score-session.derivatives[i].scoreThen)
    })
    const surprises=derivatives.some(obj=>obj.canSurprise)?Math.round(limit*SURPRISE_SHARE):0
    for (let n = 0; n < surprises; n++) {
        const i=derivatives.indexOf(derivatives.reduce((a,b)=>b.postsNumber>a.postsNumber?b:a))
        derivatives[i].postsNumber--
        const half=week.derivatives[i].postsNumber>=session.derivatives[i].postsNumber?week:session
        half.derivatives[i].postsNumber--
        half.surprises=(half.surprises||0)+1
    }
    return surprises
}
// gives each surprise to one of the allowed topics, picked at random (random() can be swapped for a seeded one)
function pickSurprises(derivatives,surprises,random=Math.random){
    const allowed=derivatives.filter(obj=>obj.canSurprise)
    for (let i = 0; i < surprises&&allowed.length; i++)
        allowed[Math.floor(random()*allowed.length)].exploreNumber++
    return derivatives
}
// the whole plan of a page: each half gets its posts, then room is made for the surprises
function planPage(mix,limit=PAGE_SIZE){
    mix.week.limit=Math.floor(limit/2)
    mix.session.limit=limit-mix.week.limit
    mix.week.surprises=0
    mix.session.surprises=0
    allocate(mix.week.derivatives,mix.week.limit)
    allocate(mix.session.derivatives,mix.session.limit)
    return makeRoom(mix,limit)
}
// the two halves as they are stored in a feed log and sent to the client
const halvesOf=mix=>[mix.week,mix.session].map(half=>({key:half.key,basis:half.basis,limit:half.limit,surprises:half.surprises||0,results:half.derivatives}))
class interestsMiddleWare{
    constructor(){

    }
    // sharePost view-comments
    // view-community
    //  post comment create-communty
    // delete-post  delete-comment
    // like-post like-comment-with-attiude
    // unlike-post
    // join-community leave-community
    // create-community
    // delete-community
    // see-post-with-duration
    // unlike-negative/positive-comment

    // adds one point to the history of an interest: the last score (after decay) plus the score of the action
    // [CHANGED] date is optional (default now)
    static async updateScore(interest,action,user,date){
        try{
            const actionScore=actionsScores[action]
            // [FIX] posts without one of the five categories and unknown actions are skipped
            // (user.interests[undefined].length crashed, and an unknown action saved NaN)
            if(!user||!CATEGORIES.includes(interest)||typeof actionScore!=='number')
                return
            const history=user.interests[interest]
            const now=date||new Date()
            let lastInterestScore=0
            // [FIX] the decay is applied to the last score before adding the action
            // (before, decay only happened while reading the feed, never in the saved history)
            if(history.length)
                lastInterestScore=calcNewLast(history[history.length-1],now).score

            // [NEW] the action is saved with the point (for the "How my feed works" page)
            const point={score:lastInterestScore+actionScore,date:now,action}
            history.push(point)
            await user.save()
            // [NEW] tell the user's open tabs: the client refreshes the feed mix (and later the charts) live
            realtime.toUser(user.id,'interests',{interest,action,score:point.score,date:point.date})
        }
        catch(err){
            console.log(err)
        }
    }
        // works out how the next page of the feed is split between the interests
        // output: req.derivatives=[{interest,score,value,weight,probability}] and req.basis
        static async calcInterests(req,res,next){
            try
            {
                const {user}=req
                // [CHANGED] the query is no longer required (a fresh feed sends no positions)
                // [CHANGED] the calculation moved to calcMix above: half of the page from the last 7 days, half from this session
                const mix=calcMix(user.interests,new Date())
                const {basis,window,derivatives}=mix
                // [NEW] the two halves (week and session), for planPage
                req.mix=mix
                req.derivatives=derivatives
                // [NEW] which window decided the mix, so the client can explain it
                req.basis=basis
                req.window=window
                return next()
            }
            catch(err){
                console.log(err)
                return res.json({success:false,err:err.message})
            }
        }
}
// [NEW] also used by the seed script and the post / community routes, so they follow the same rules
interestsMiddleWare.CATEGORIES=CATEGORIES
interestsMiddleWare.actionsScores=actionsScores
interestsMiddleWare.WINDOWS=WINDOWS
interestsMiddleWare.calcNewLast=calcNewLast
interestsMiddleWare.calcDerivatives=calcDerivatives
interestsMiddleWare.calcMix=calcMix
interestsMiddleWare.allocate=allocate
interestsMiddleWare.makeRoom=makeRoom
interestsMiddleWare.pickSurprises=pickSurprises
interestsMiddleWare.planPage=planPage
interestsMiddleWare.halvesOf=halvesOf
interestsMiddleWare.PAGE_SIZE=PAGE_SIZE
interestsMiddleWare.SURPRISE_SHARE=SURPRISE_SHARE
interestsMiddleWare.DECAY_PER_DAY=DECAY_PER_DAY
module.exports=interestsMiddleWare

// ============================================================================================
// The original versions, kept for reference
// ============================================================================================
//     static async updateScore(interest,action,user){
//         try{
//             const actionsScores={ ... the list above ... }
//          let   historyLength=user.interests[interest].length
//           let  lastInterestScore=user.interests[interest][historyLength-1].score
//
//           user.interests[interest].push({score:lastInterestScore+actionsScores[action],date:new Date()})
//           await user.save()
//
//         }
//         catch(err){
//             console.log(err)
//         }
//     }
//         static async calcInterests(req,res,next){
//             try
//             {
//                 let derivatives=[]
//                 const {query,user}=req
//                 const qs=Object.keys(query)
//                 if(!qs.length)
//                     return res.json({succuss:false,err:'no query was sent'})
//                 const interests=Object.keys(user.interests)
//                 interests.forEach(interest=>{
//                    let scoreFunction= user.interests[interest]
//                    if(!query[interest])
//                         return
//                    if(scoreFunction.length===0)
//                         return
//                         const newLastPoint=calcNewLast(scoreFunction[scoreFunction.length-1])
//                     scoreFunction.push(newLastPoint)
//                     const wantedDate= subtractTimeFromDate(new Date(),5,'minute')
//
//                     let index=findValue(scoreFunction,wantedDate)
//                     const pointI=calcPoint(scoreFunction[index+1].score,scoreFunction[index+1].date.getTime(),scoreFunction[index].score,scoreFunction[index].date.getTime(),wantedDate.getTime())
//
//
//                     let derivative=(newLastPoint.score-pointI.yi)/(newLastPoint.date.getTime()-pointI.xi)*1000
//                     derivatives.push({value:derivative,interest})
//             })
//               console.log(derivatives)
//             // Calculate the sum of all value properties
//             let totalSum = derivatives.reduce((sum, obj) => sum + obj.value, 0);
//
//             // Calculate the percentage of each value property and add it as a new key to each object
//              derivatives.forEach(obj => obj.probability = (obj.value / totalSum).toFixed(1));
//                 req.derivatives=derivatives
//                 return next()
//             }
//             catch(err){
//                 console.log(err)
//                 return res.json({success:false,err:err.message})
//             }
//         }
