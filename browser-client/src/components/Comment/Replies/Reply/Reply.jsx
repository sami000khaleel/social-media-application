import {useState,useEffect,useRef} from 'react'
import {CommentForm} from '../../../index.js'
import store from 'store'
import Replies from '../Replies.jsx'
import { commentApi } from '../../../../resources/api'
import star from '../../../../resources/images/star.png'
const Reply = ({comment,passedUser}) => {
const [reply,setReply]=useState(comment)
const [showReplies,setShowReplies]=useState(false)
const [user,setUser]=useState(passedUser)
const [formFlage,setFormFlage]=useState(false)
const leftLine=useRef('')
const [flage,setFlage]=useState(false)

  async function handleStarClick(){
    console.log(reply._id)
    const data=await commentApi.likeComment(reply._id,reply.postId)
    if(!data.success)
    return
    setReply(pre=>({... pre,likedBy: data.comment.likedBy}))
  }
  function handleShowReplies(){
    setShowReplies(pre=>!pre)
   }
   const appendReplies=(newReply)=>{
    setReply(pre=>{return {...pre,repliedBy:[... reply.repliedBy,newReply]}})
    console.log('vvvvzzzz')
    setShowReplies(true)
   }
   useEffect(()=>{
    setFlage(pre=>!pre)
  },[reply])
   const updateCommentFormFlage=()=>setFormFlage(pre=>!pre)
   return (
    <>
   <div className="  card  m-3  reply-container  d-flex   justify-content-start flex-column align-items-start " style={{ width:'60%',maxWidth:'400px',minWidth:'200px' }} >
    <span className="left-line"></span>
<div style={{ width:'100%' }} className="reply-header  d-flex flex-row align-items-center justify-content-start  p-1 " >
<h5 style={{ marginRight:'50px' }} className=''>{user.firstName} {user.lastName}</h5>
<div style={{ width:'40px',height:'40px' }} className="profile-image">

<img  className=' border position-relative '  
style={{ 
  top:`${user.profileImage.style.top*6/40}px`
  ,
  objectFit:'contain',
  scale:String(Number(user.profileImage.style.scale*1.3))
   }} src={user.profileImage?`http://localhost:1000/api/user-profile-image/${user.profileImage.imageName}?userId=${user._id}`:'*'} height='100'  alt="profile-image" />  
    </div>
</div>
<div style={{ width:'100%' }} className=" d-flex flex-row justidy-content-start p-2 reply-body">
         {reply.content}
</div>
<div className=" p-3 d-flex flex-row justify-content-between reply-tail">

<div  className="like-container">
            <span onClick={handleStarClick} className='svg-container' >
               {reply.likedBy.some((id)=>id===store.get('user')._id)?<img src={star} alt="star" height='20px' width='20px' />:<svg className={`${reply.likedBy.some(likeId=>likeId===store.get('user')._id)&&'liked-svg'}`}  xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
                 <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
</svg>}
              </span>
<span  className='number-holder' >{reply.likedBy.length}</span>
                  </div>




<div className='inner-reply-container' >
<span  className='svg-container' >
<svg onClick={()=>{updateCommentFormFlage()
return store.set('repliedComment',reply)
}}  xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
<path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
</svg>
</span>
<span onClick={handleShowReplies} className='number-holder' >{reply.repliedBy.length}</span>
</div>

</div>

</div>
        {showReplies&&
<span style={{ marginLeft:'50px' }}>
<Replies updateCommentFormFlage={updateCommentFormFlage} appendReplies={appendReplies} comments={reply.repliedBy}/>

</span>
}
{formFlage&&<CommentForm  appendReplies={appendReplies} updateCommentFormFlage={updateCommentFormFlage}  postId={comment.postId}/>}

    </>
    )
}

export default Reply