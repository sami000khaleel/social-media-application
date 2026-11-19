// [NEW] file: helpers shared by the controllers (what a user card / a populated post contains, safe file names)
// Helpers shared by the controllers: what a user looks like to other people,
// how a post is populated before it is sent, and safe file names for uploads.
const path=require('path')

// the fields of a user that are shown next to a post, a comment or in a list
const USER_CARD='firstName lastName profileImage'

// what anyone may see on a profile page (no email, phone, password or interests)
const PUBLIC_FIELDS=['_id','firstName','lastName','middleName','profileImage','coverImage','job','education',
    'followers','followes','posts','managedCommunities','adminedCommunities','createdAt']
function publicProfile(user){
    const full=user.toJSON()
    const profile={}
    PUBLIC_FIELDS.forEach(field=>{
        if(full[field]!==undefined)
            profile[field]=full[field]
    })
    if(full.address)
        profile.address={country:full.address.country,city:full.address.city}
    return profile
}

// every post that goes to the client carries its publisher, the post it shares (if any)
// and the name of its community (if any)
const POST_POPULATE=[
    {path:'publisher',select:USER_CARD},
    {path:'sharedPost.post',populate:{path:'publisher',select:USER_CARD}},
    {path:'community.communityId',select:'communityName'}
]

const isId=value=>typeof value==='string'&&/^[0-9a-fA-F]{24}$/.test(value)

// uploads keep their original name, so remove folders and characters a file name can not have
function safeFileName(name){
    const base=path.basename(String(name||'file').replace(/\\/g,'/'))
    return base.replace(/[\/:*?"<>|\x00-\x1f]/g,'_').replace(/^\.+/,'').slice(-80)||'file'
}
// a file name that came in a url must be a plain name, never a path
const isPlainFileName=name=>typeof name==='string'&&name.length>0&&name===path.basename(name)&&!name.includes('\\')&&name!=='..'&&name!=='.'

module.exports={USER_CARD,publicProfile,POST_POPULATE,isId,safeFileName,isPlainFileName}
