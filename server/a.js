function calcNewLast(p){
    const currentTime=new Date()
    const diffTime = Math.abs(currentTime - p.date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const newScore=p.score-2*diffDays
    const newLast={score:newScore,date:currentTime}
    return newLast
    }
function calcPoint(p2,p1,xi){
    const {x1,y1}=p1
    const {x2,y2}=p2
    if(xi>x2)
        {
            console.log('xi is bigger than x2 error')
            return 
        }
        
        const deltaI=x2-xi
        const delta=x2-x1
        const diffX=(delta-deltaI)/delta
        console.log(diffX)
        const deltaY=y2-y1   
        console.log((delta/deltaI)*deltaY+y1)
        const yi=deltaY*diffX+y1

        const pi={xi,yi}
    return pi
}
const p1={x1:0,y1:3}
const p2={x2:3,y2:-1}
const xi=3
const p={score:5,date:new Date('2022-06-01')}
console.log(calcPoint(p2,p1,xi))
