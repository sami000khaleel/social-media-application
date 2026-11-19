// [NEW] file: the data behind the "How my feed works" page.
// Everything here is the signed-in user's own data: nobody can see someone else's.
const FeedLog=require('../models/feedLogSchema.js')
const Post=require('../models/postSchema.js')
const {POST_POPULATE}=require('../utils/shape.js')
const interestsMiddleWare=require('../middleware/interestsMiddleware.js')
const {CATEGORIES,WINDOWS,DECAY_PER_DAY,actionsScores,calcMix,planPage,halvesOf,PAGE_SIZE,SURPRISE_SHARE}=interestsMiddleWare
const DAY=24*60*60*1000

class insightsController{
    // GET /api/insights/try?topic=sport: up to 3 recent posts of one topic that you have not reacted to yet,
    // so the "Try it" box can let you like them right there and watch your next page change
    static async tryPosts(req,res){
        try{
            const topic=req.query.topic
            if(!CATEGORIES.includes(topic))
                return res.json({success:false,err:'choose a topic: '+CATEGORIES.join(', ')})
            const me=req.user.id
            // a demo visitor's copy should not be offered the posts of the person it was copied from
            const own=[me,String(req.user.demoCloneOf||'')]
            const posts=await Post.find({category:topic,postCategorySeq:{$gte:1}}).sort({createdAt:-1}).limit(40).populate(POST_POPULATE)
            const fresh=posts.filter(post=>!own.includes(String(post.publisher&&post.publisher._id))
                &&!post.likes.some(id=>id.toString()===me)&&!post.dislikes.some(id=>id.toString()===me)&&!post.sharedPost.post)
            return res.json({success:true,posts:fresh.slice(0,3)})
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
    // GET /api/feed-mix: only the mix right now (the home page asks this after every reaction)
    // why: asking /get-posts for that would send posts and write a feed log every time
    static async feedMix(req,res){
        // [CHANGED] with the whole posts of the next page and how many of them are random surprises
        // [CHANGED] the two halves too (week and session)
        const surprises=planPage(req.mix,PAGE_SIZE)
        return res.json({success:true,results:req.derivatives,halves:halvesOf(req.mix),basis:req.basis,limit:PAGE_SIZE,surprises})
    }
    // GET /api/insights?days=35
    static async insights(req,res){
        try{
            const {user}=req
            const days=Math.min(Math.max(parseInt(req.query.days)||35,1),90)
            const now=new Date()
            const since=new Date(now.getTime()-days*DAY)
            // 1) the mix if the feed were loaded now, with the posts a page would get ([CHANGED] 30, with surprises)
            const mix=calcMix(user.interests,now)
            const surprises=planPage(mix,PAGE_SIZE)
            // 2) the score history of every interest in the period
            // (with the last point before it, so every line starts at the left edge)
            const history={}
            CATEGORIES.forEach(interest=>{
                const points=user.interests[interest]||[]
                const inside=points.filter(p=>p.date>=since)
                const before=points.filter(p=>p.date<since).pop()
                history[interest]=(before?[{score:interestsMiddleWare.calcNewLast(before,since).score,date:since,action:null}]:[]).concat(inside)
                    .map(p=>({score:p.score,date:p.date,action:p.action||null}))
            })
            // 3) the mix of every page in the period (small: for the "how your mix changed" chart)
            const all=await FeedLog.find({user:user.id,createdAt:{$gte:since}}).sort({createdAt:1})
            const mixHistory=all.map(log=>({date:log.createdAt,basis:log.basis,
                shares:Object.fromEntries(log.results.map(r=>[r.interest,r.probability])),
                posts:Object.fromEntries(CATEGORIES.map(c=>[c,log.posts.filter(p=>p.category===c).length])),
                // [NEW] why the posts were sent: from the week half, the session half, a surprise or a filler
                reasons:log.posts.reduce((sum,p)=>{const key=p.reason==='mix'?'week':p.reason||'week';sum[key]=(sum[key]||0)+1;return sum},{})}))
            // 4) the last 30 pages in full, with the posts that were in them
            const deliveries=await FeedLog.find({user:user.id,createdAt:{$gte:since}}).sort({createdAt:-1}).limit(30)
                .populate({path:'posts.post',select:'describtion category publisher createdAt',populate:{path:'publisher',select:'firstName lastName'}})
            return res.json({
                success:true,
                now:{date:now,basis:mix.basis,results:mix.derivatives,halves:halvesOf(mix),limit:PAGE_SIZE,surprises},
                rules:{windows:WINDOWS,decayPerDay:DECAY_PER_DAY,scores:actionsScores,pageSize:PAGE_SIZE,surpriseShare:SURPRISE_SHARE},
                since,history,mixHistory,deliveries
            })
        }
        catch(err){
            console.log(err)
            return res.json({success:false,err:err.message})
        }
    }
}
module.exports=insightsController
