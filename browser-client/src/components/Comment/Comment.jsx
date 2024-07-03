import React from 'react'
import { Link } from 'react-router-dom'
import store from 'store'
import { useEffect,useState,useRef} from 'react'
import Comments from '../../pages/Comments/Comments'
import {commentApi} from '../../resources/api/index.js'
import Replies from './Replies/Replies' 
import star from '../../resources/images/star.png' 
import CommentForm from './CommentForm/CommentForm'
const Comment = ({passedComment,user,postId}) => {
  const [editModeFlage,setEditModeFlage]=useState(false)
  const [optionListFlage,setOptionListFlage]=useState(false)
  const [comment,setComment]=useState(passedComment)
  const [content,setContent]=useState(comment.contnet)
        const [showReplies,setShowReplies]=useState(false)
        const [visibleContent,setVisibleContent]=useState([])
        const [hiddenContent,setHiddenContent]=useState([])
        const [formFlage,setFormFlage]=useState(false)
       const contentRef=useRef('')
       async function handleStarClick(){
        const data=await commentApi.likeComment(comment._id,comment.postId)
        if(!data.success)
        return
        setComment(pre=>({... pre,likedBy: data.comment.likedBy}))
      }
       function handleShowReplies(){
        setShowReplies(pre=>!pre)
       }
       function appendReplies(newComment){
        if(!newComment.repliedTo){
            return 
        }
        console.log('sdsad')
        setComment(pre=>{return {... comment,repliedBy:[... comment.repliedBy ,newComment]}})
        setShowReplies(true)
      }
        const updateCommentFormFlage=()=>setFormFlage(pre=>!pre)
      async function handleDeleteComment(){

          const data=await commentApi.deleteComment(comment._id)
        setComment({_id:''})
        }
      async function handleEditContent(e){
setComment({...comment,content:e.target.value})
      }
      async function updateComment(){
        const data=await commentApi.updateComment(comment._id,comment.content)
        if(!data.success)
        console.log('s')
        setEditModeFlage(false)
        setContent(data.comment.content)
        setComment(data.comment)
      }
      async function handleCancelEdit(){
        setContent({... comment,content:content})
        setEditModeFlage(false)
      }
      console.log(editModeFlage)
        return (
        <>
         {comment._id?<>
<div className="  card  m-4  comment-container  d-flex   justify-content-start flex-column align-items-start p-1" style={{ width:'60%',maxWidth:'400px' }} >
<div style={{ width:'100%' }} className="comment-header  d-flex flex-row align-items-center justify-content-between flex-nowrap p-1 "  >
<Link style={{  }} className='comment-header-link  d-flex flex-row-reverse justify-content-between align-items-center' to={`/user/${user._id}`} >
<h5 style={{ marginRight:'50px',fontSize:'.8rem' }} className=''>{user.firstName} {user.lastName}</h5>
<div style={{ width:'40px',height:'40px',marginRight:'7px' }} className="profile-image">

<img  className=' border position-relative '  
style={{ 
  top:`${user.profileImage.style.top*6/40}px`
  ,
  objectFit:'contain',
  scale:String(Number(user.profileImage.style.scale*1.3))
   }} src={user.profileImage?`http://localhost:1000/api/user-profile-image/${user.profileImage.imageName}?userId=${user._id}`:'*'} height='100'  alt="profile-image" />  
    </div>
    
  </ Link>
  {comment.user===store.get('user')._id&&<div className='position-relative'  onClick={()=>setOptionListFlage(pre=>!pre)}> <svg    xmlns="http://www.w3.org/2000/svg" width="46" style={{position:'relative', cursor:'pointer' }} height="40" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
</svg>
                { optionListFlage&&<span className="list-options position-absolute d-flex flex-column justify-content-center align-items-center ">
                  <span onClick={()=>setEditModeFlage(pre=>!pre)} className="list-option">
                    edit
                  </span>
                  <span onClick={handleDeleteComment} className="list-option">
                    delete
                  </span>
                  </span>}
</div>
                  }
</div>
{!editModeFlage?<div style={{ width:'100%' }} className=" d-flex flex-row justidy-content-start p-2 comment-body">
         {comment.content}
</div>:<span className=''><p>edit your comment ... </p><textarea onChange={(e)=>handleEditContent(e)} style={{ height:'100px',width:'100%' }} type='textArea' value={comment.content}  className='form-control' ></textarea>
                     <span className='d-flex justify-content-between'>  <button onClick={updateComment} className="btn">edit</button><button onClick={handleCancelEdit} className="btn">cancel</button></span>
                     </span>}
<div className=" p-3 d-flex flex-row justify-content-between comment-tail">

<div  className="like-container">
            <span onClick={handleStarClick} className='svg-container' >
               {comment.likedBy.some((id)=>id===store.get('user')._id)?<img src={star} alt="star" height='20px' width='20px' />:<svg className={`${comment.likedBy.some(likeId=>likeId===store.get('user')._id)&&'liked-svg'}`}   xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
                 <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
</svg>}
              </span>
<span  className='number-holder' >{comment.likedBy.length}</span>
                  </div>




<div className='comment-reply-container' >
<span  className='svg-container' >
<svg  onClick={()=>{updateCommentFormFlage()
console.log('s')
return store.set('repliedComment',comment)
}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
<path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
</svg>
</span>
<span onClick={()=>handleShowReplies() }className='number-holder' >{comment.repliedBy.length}</span>
</div>

</div>

</div>
{showReplies&&comment.repliedBy.length&&<Replies  comments={comment.repliedBy} />}
      {formFlage&&<CommentForm  appendReplies={appendReplies} updateCommentFormFlage={updateCommentFormFlage} postId={comment.postId}/>}
        </>
:null
        }
        </>
    )
  }
  
  export default Comment