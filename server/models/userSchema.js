const mongoose = require('mongoose')
const userSchema= new mongoose.Schema({
    blockedCommunities:[{type:mongoose.SchemaTypes.ObjectId,ref:'Community'}]    
,
    blockedUsers:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],

    firstName:{
        type:String,required:true
    },age:{
        type:Number,required:true
    },
    password:{
        required:true,
        type:String
    }
    ,
    lastName:{
        type:String
        ,required:true
    },
    middleName:{ 
    type:String
    },
    posts:[{type:mongoose.SchemaTypes.ObjectId,ref:'Post'}],
    profileImage:{
            imageName:{type:String,default:''},
            style:{
                top:{type:String,default:''},
                scale:{type:String,default:''}
            }            
    },
    coverImage:{
            imageName:{type:String,default:''},
            style:{
                top:{type:String,default:''},
                scale:{type:String,default:''}
            }            
    },
    followers:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
    followes:[{type:mongoose.SchemaTypes.ObjectId,ref:'User'}],
    address:{
        country:String,
        city:String,
        street:String
    },
    job:String,
    education:{
        educationLevel:String,
        educationPlace:String,
        finished:Boolean
    },

    managedCommunities:[{type:mongoose.SchemaTypes.ObjectId,ref:'Community'}],
    adminedCommunities:[{type:mongoose.SchemaTypes.ObjectId,ref:'Community'}],
    communities:[{communityId:{type:mongoose.SchemaTypes.ObjectId,ref:'Community'},approved:{
        type:Boolean,
        default:false
    }}],
    // [NEW] action: what caused this point (likePost, sharePost, ...), shown on the "How my feed works" page
    // [FIX] default:()=>new Date() instead of default:new Date()
    // why: new Date() ran once when the server started, so every new point got the server start time
    interests:{
        business:[{score:{type:Number,default:0},date:{type:Date,default:()=>new Date()},action:String}],
        tech:[{score:{type:Number,default:0},date:{type:Date,default:()=>new Date()},action:String}],
        entertainment:[{score:{type:Number,default:0},date:{type:Date,default:()=>new Date()},action:String}],
        sport:[{score:{type:Number,default:0},date:{type:Date,default:()=>new Date()},action:String}],
        politics:[{score:{type:Number,default:0},date:{type:Date,default:()=>new Date()},action:String}]
    },
    photosUrl:[String],
    email:{
        type:String,
    },
    phoneNumber:{
        type:Number
    },
    notifications:[{type:mongoose.SchemaTypes.ObjectId,ref:'Notification'}],
    postsLiked:[{type:mongoose.SchemaTypes.ObjectId,ref:'Post'}],
    commentsLiked:[{type:mongoose.SchemaTypes.ObjectId,ref:'Comment'}],
    comments:[{type:mongoose.SchemaTypes.ObjectId,ref:'Comment'}],
    // [NEW] accounts made by the seed script. With DEMO_MODE on, visitors can sign in to them without a password
    // (only the ones with a demoStory are offered), and writing is turned off for them (see middleware/demoMode.js)
    demo:{type:Boolean,default:false},
    // [NEW] one line shown on the sign in page, e.g. "Was into sport, now into tech"
    demoStory:String,
    // [NEW] every demo visitor gets a private copy of the person they picked, so visitors who come at the same
    // time do not see each other's clicks. This is the person it was copied from. Copies are deleted after 3 hours.
    demoCloneOf:{type:mongoose.SchemaTypes.ObjectId,ref:'User'},
    // [NEW] the moment a made-up person's activity is "as of": when they sign in, everything they did is moved
    // forward by the time since then, so "5 minutes before the data was made" becomes "5 minutes ago"
    demoTimeAt:Date
},{versionKey:false,timestamps:true})
// [SECURITY] the password hash is removed whenever a user is turned into JSON
// why: several routes sent the whole user document, bcrypt hash included
userSchema.set('toJSON',{
    transform(doc,ret){
        delete ret.password
        // [NEW] the demo restrictions only exist while DEMO_MODE is on; without it the seeded people are normal accounts
        ret.demo=Boolean(ret.demo)&&String(process.env.DEMO_MODE).toLowerCase()==='true'
        return ret
    }
})
module.exports=mongoose.model('User',userSchema)
