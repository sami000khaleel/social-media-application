// [NEW] file: one row for every page of the feed that was sent to a user (GET /api/get-posts).
// It keeps the whole calculation, so the "How my feed works" page can show later why the feed looked the way it did.
const mongoose = require('mongoose')
const feedLogSchema=new mongoose.Schema({
    user:{type:mongoose.SchemaTypes.ObjectId,ref:'User',required:true},
    // [CHANGED] 'split' (half week, half session), 'week' (nothing in this session yet) or 'even' (nothing climbing)
    basis:String,
    // how many posts were asked for
    limit:Number,
    // one row per interest: the numbers calcMix worked with
    results:[{
        interest:String,
        scoreThen:Number,      // the score at the start of the window (interpolated between the two nearest points)
        score:Number,          // the score now (after the daily decay)
        value:Number,          // the slope, points per second
        weight:Number,         // the slope when the score is positive and rising, otherwise 0
        probability:Number,    // the share of the page
        postsNumber:Number,    // how many posts that share became
        exploreNumber:Number   // [NEW] how many random surprise posts this topic got (only topics the mix gave nothing)
    }],
    // [NEW] the two halves of the page, each with its own calculation (see calcMix):
    // key 'week' (last 7 days) or 'session' (last 30 minutes); basis 'week' | 'even' | 'session' | 'followsWeek'
    halves:[{
        key:String,
        basis:String,
        limit:Number,          // posts in this half (15 of 30)
        surprises:Number,      // how many of them were given to surprises
        results:[{interest:String,scoreThen:Number,score:Number,value:Number,weight:Number,probability:Number,postsNumber:Number}]
    }],
    // the posts that were sent
    posts:[{
        post:{type:mongoose.SchemaTypes.ObjectId,ref:'Post'},
        category:String,
        reason:String          // 'week' or 'session' (the half that picked it), 'surprise' (random, see makeRoom) or 'filler' (a topic ran out of posts)
    }]
},{versionKey:false,timestamps:true})
module.exports=mongoose.model('FeedLog',feedLogSchema)
