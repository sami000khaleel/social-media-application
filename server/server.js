const express = require('express')
const multer = require('multer');
// [CHANGED] uploads stay in memory until they are saved, so limit them to 10 MB and 8 files per request
const upload=multer({limits:{fileSize:10*1024*1024,files:8}})
require('dotenv').config()
const cors = require('cors')
const Comment=require('./models/commentSchema.js')
const postsRouter = require('./routes/postsRoute.js');
const userRouter = require('./routes/userRoute.js');
const rootRouter=require('./routes/rootRoute.js')
const mongoose = require('mongoose');
const User=require('./models/userSchema.js')
const communityRouter=require('./routes/communityRoute.js')
const commentsRouter=require('./routes/commentsRoute.js');
// [NEW] direct messages, and Socket.IO for everything real time (replaces the Firebase features)
const messageRouter=require('./routes/messageRoute.js')
const realtime=require('./realtime.js')
// [NEW] the public demo for visitors (DEMO_MODE=true), see middleware/demoMode.js
const demoMode=require('./middleware/demoMode.js')
const path=require('path')
const fs=require('fs')
// [NEW] without a secret every sign in fails with a confusing error, so stop with a clear message instead
if(!process.env.JWT_SECRET){
    console.log('JWT_SECRET is missing. Put a long random text in server/.env (see .env.example) and start again.')
    process.exit(1)
}
// [NEW] the same for the database address
if(!process.env.DATABASE_URL){
    console.log('DATABASE_URL is missing. Put your MongoDB address in server/.env (see .env.example) and start again.')
    process.exit(1)
}
const app=express()
// [FIX] Mongoose 6 has no (url, onSuccess, onError) form; the promise is used instead
// mongoose.connect(process.env.DATABASE_URL,()=>console.log('connected to database'),err=>console.log(err))
mongoose.connect(process.env.DATABASE_URL)
    .then(()=>console.log('connected to database'))
    // [CHANGED] says what to check instead of only printing the error object
    .catch(err=>console.log(`could not reach the database: ${err.message}\nCheck DATABASE_URL in server/.env (and, on MongoDB Atlas, the user, the password and Network Access).`))
// [CHANGED] CLIENT_URL (optional): when the front end is deployed on its own address, only that address
// may call the API. Not set: any address may (the API uses tokens, not cookies, so that is safe enough).
const clientUrls=(process.env.CLIENT_URL||'').split(',').map(url=>url.trim().replace(/\/$/,'')).filter(Boolean)
app.use(cors({
    origin:clientUrls.length?clientUrls:'*',
    credentials:true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
}))

  app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(upload.any())
// [NEW] demo accounts may react but not write (does nothing unless DEMO_MODE=true)
app.use('/api',demoMode.guard)
app.get('/api/demo',demoMode.info)
app.post('/api/demo/login',demoMode.login)
app.use('/api',rootRouter)
app.use('/api/user',userRouter)
app.use('/api/posts',postsRouter)
app.use('/api/comments',commentsRouter)
app.use('/api/community',communityRouter)
app.use('/api/messages',messageRouter)   // [NEW]

// [NEW] the built React app (client/dist, made by "npm run build") is served from the same address,
// so the whole project runs as ONE service when it is published. Every page that is not /api gets index.html.
const clientBuild=path.join(__dirname,'..','client','dist')
if(fs.existsSync(path.join(clientBuild,'index.html'))){
    app.use(express.static(clientBuild))
    app.use((req,res,next)=>{
        if(req.method!=='GET'||req.path.startsWith('/api')||req.path.startsWith('/socket.io'))
            return next()
        return res.sendFile(path.join(clientBuild,'index.html'))
    })
}
// [NEW] the front end lives on its own address (two deployments): send visitors of the API's address there
else if(clientUrls.length){
    app.get('/',(req,res)=>res.redirect(clientUrls[0]))
}
// [NEW] no build yet: the address in the browser still answers with what to do, instead of "Cannot GET /"
else{
    app.get('/',(req,res)=>res.set('Content-Type','text/plain; charset=utf-8').send('The API is running. The web app is not built yet:\n'+
        '  - run "npm run build" in the project folder, then "npm start" again and reload this page, or\n'+
        '  - run "npm run dev:client" in a second terminal and open http://localhost:5173'))
}

// [NEW] a broken upload or request body (too big, bad JSON) gets a JSON answer like every other error
app.use((err,req,res,next)=>{
    console.log(err.message)
    return res.status(400).json({success:false,err:err.message})
})
// [CHANGED] the port can be set in .env (default stays 1000)
// app.listen(1000,()=>console.log('http://localhost:1000'))
const PORT=process.env.PORT||1000
// [NEW] Socket.IO runs on the same port as the API
const server=app.listen(PORT,()=>console.log(`http://localhost:${PORT}`))
realtime.attach(server)
// [NEW] keeps the demo data fresh (only with DEMO_MODE=true)
demoMode.autoReset()
