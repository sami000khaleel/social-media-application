// [NEW] file: sends an uploaded file (post picture, profile picture, cover, community cover).
// why: on a free host (Render) the disk is wiped when the service sleeps or redeploys, but the database
// (Atlas) keeps the file names, so res.sendFile failed with "ENOENT: no such file or directory" and the
// pictures of the demo people and posts were gone. A demo picture is drawn again from its name
// (scripts/seed-images.js fromName), exactly as the seed drew it. Anything else that is missing gets a
// clean 404 instead of an error in the log.
const fs=require('fs')
const path=require('path')
const images=require('../scripts/seed-images.js')

function sendUpload(res,filePath){
    if(fs.existsSync(filePath))
        return res.sendFile(filePath)
    const svg=images.fromName(path.basename(filePath))
    if(!svg)
        return res.status(404).json({success:false,err:'file not found'})
    // nothing is written to the disk here: drawing is cheap, and a stranger asking for made-up names
    // must not be able to fill the disk
    res.set('Content-Type','image/svg+xml')
    res.set('Cache-Control','public, max-age=86400')
    return res.send(svg)
}
module.exports=sendUpload
