
const User=require('../models/userSchema.js')
function calcNewLast(p){
    let newScore
    const currentTime=new Date()
    const diffTime = Math.abs(currentTime - p.date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if(p.score>=0)
     newScore=p.score-2*diffDays
     if(p.score<0)
     newScore=p.score+2*diffDays

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
  function calcLine(y2,y1,x2,x1,xi){
    const m=(y2-y1)/(x2-x1)
    const b=y2-m*x2
console.log(b+m*xi,'bb')
console.log(y2,y1)
    const yi=m*xi+b
    return xi
  }
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
  function findValue(data,wantedDate){
    if(wantedDate.getTime()<data[0].date.getTime())
    return 0
    for (let i = data.length-1; i >= 0; i--) 
    {
        let deltaDate=wantedDate.getTime()-data[i].date.getTime()
        if(deltaDate>=0)
        {
            console.log(i)
            return i
        }    
    }
  }
function getDerivative(days,hours,minutes,seconds){
    data=data.map(obj=>({score:obj.score,date:obj.date.getTime()}))
    const scores=data.map(({score})=>score)
    const times=data.map(({date})=>date)
}
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
    
    static async updateScore(interest,action,user){
        try{
            
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
            unLikePost:-5,
            sharePost:20,
            createPost:15,
            negativeComment:-5,
                positiveComment:5,
                createCommunity:10,
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
                seePostWithDuration3:9,}
         let   historyLength=user.interests[interest].length
          let  lastInterestScore=user.interests[interest][historyLength-1].score
                  

          user.interests[interest].push({score:lastInterestScore+actionsScores[action],date:new Date()})
          await user.save()

        }
        catch(err){
            console.log(err)
        }
    }
        static async calcInterests(req,res,next){
            try
            {
                let derivatives=[]
                const {query,user}=req
                const qs=Object.keys(query)
                if(!qs.length)
                    return res.json({succuss:false,err:'no query was sent'})
                const interests=Object.keys(user.interests)
                interests.forEach(interest=>{
                   let scoreFunction= user.interests[interest]
                   if(!query[interest])
                        return
                   if(scoreFunction.length===0)
                        return   
                        const newLastPoint=calcNewLast(scoreFunction[scoreFunction.length-1])    
                    scoreFunction.push(newLastPoint)
                    const wantedDate= subtractTimeFromDate(new Date(),5,'minute')

                    let index=findValue(scoreFunction,wantedDate)
                    const pointI=calcPoint(scoreFunction[index+1].score,scoreFunction[index+1].date.getTime(),scoreFunction[index].score,scoreFunction[index].date.getTime(),wantedDate.getTime())
                    
                    
                    let derivative=(newLastPoint.score-pointI.yi)/(newLastPoint.date.getTime()-pointI.xi)*1000  
                    derivatives.push({value:derivative,interest})
            })
              console.log(derivatives)
            // Calculate the sum of all value properties
            let totalSum = derivatives.reduce((sum, obj) => sum + obj.value, 0);
  
            // Calculate the percentage of each value property and add it as a new key to each object
             derivatives.forEach(obj => obj.probability = (obj.value / totalSum).toFixed(1));
                req.derivatives=derivatives
                return next()
            }
            catch(err){
                console.log(err)
                return res.json({success:false,err:err.message})
            }
        }
}
module.exports=interestsMiddleWare