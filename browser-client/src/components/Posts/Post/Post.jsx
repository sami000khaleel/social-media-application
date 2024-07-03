// `http://localhost:1000/api/${post.files[0].fileName}?postId=${post._id}
// if user is the the author or the the owner is the author then dont fetch the autor other wise fetch
import star from '../../../resources/images/star.png'
import postApi from '../../../resources/api/post_requests'
import React from 'react'
import userAPI from '../../../resources/api/user_requests'
import {useRef,useState,useEffect} from 'react'
import { useNavigate } from 'react-router-dom'
import store from 'store'
import { Link } from 'react-router-dom'
import MakePost from '../../MakePost/MakePost'
import communityApi from '../../../resources/api/community_requests'
const Post = ({communityDeletePost,communityApprovePost,post,updateCommentFormFlage,shared,numberOfComments,community}) => {
  const [currentPost,setCurrentPost]=useState(post)
  const [optionListFlage,setOptionListFlage]=useState(false)
  const [editModeFlage,setEditModeFlage]=useState(false)
  const [author,setAuthor]=useState(()=>{
    
    if(store.get('owner')._id===post.publisher)
      return store.get('owner')
    if(store.get('user'._id===post.publisher))
      return store.get('user')
      return {_id:'',profileImage:{imageName:''}}

  })  
  // const [post,setPost]=useState(post)
  const postHeaderRef=useRef('')
  const [currentCommunity,setCurrentCommunity]=useState({_id:''})
  const [changeFlage,setChangeFlage]=useState(false)
  const [showFormFlage,setShowFormFlage]=useState(false)
  const [sharedPost,setSharedPost]=useState({_id:''})
  const [showCommentsFlage,setShowCommentsFlage]=useState(false)
  const [clickedSvgFlage,setClickedSvgFlage]=useState(false)
  const [hideDescribtionFlage,setHideDescribtionFlage]=useState(true)
  const [describtion,setDescribtion]=useState(currentPost.describtion)
  const [visibleDescribtion,setVisibleDescribtion]=useState([])
  const [hiddenDescribtion,setHiddenDescribtion]=useState([])
  const navigate=useNavigate()
  const handleStarClick=e=>{
  }
 async function handleStar(){
  const data=await postApi.likePost(postId) 
  }
  const handleShareClick=e=>{
    setShowFormFlage(pre=>!pre)
  }
//fetch user data
const describtionRef=useRef('')
useEffect(()=>{
  async function getSharedPost(){
    if(!post.sharedPost.post)
      return 
    const data=await postApi.getPost(post.sharedPost.post)
    if(!data.success)
    return
    console.log(data)
    setSharedPost(data.post)  
  }
  async function getUser(){
    if(!author._id)
    {
      console.log(post)
      const data=await userAPI.getUser(post.publisher)
      console.log(data)
      setAuthor(data.user)
    }
  }
  getUser()
  // console.log(showFormFlage)
  getSharedPost()
  const visibleDescribtion=describtion.slice(0,55)
  const hiddenDescribtion=describtion.slice(9)
  setHiddenDescribtion(hiddenDescribtion)
  setVisibleDescribtion(visibleDescribtion)
},[])
async function handleLike(){
  const data=await postApi.like(currentPost._id)
  if(!data.success)
  return
  setCurrentPost(data.post)
  console.log(data.post)
  console.log('as')
}
async function handleViewLikers(){
  const data=await postApi.getLikes(currentPost._id)
  if(!data.success)
  return 
  store.set('users',data.users)
  navigate('/users')
  
  }
  async function handleViewComments(postId){
    console.log('ssdad')
    navigate(`/comments/${currentPost._id}`)
  }
  const updateFlage=()=>{setShowFormFlage(pre=>!pre)
  setChangeFlage(pre=>!pre)
  }
  useEffect(()=>{
    async function getPost(){
      const data=await postApi.getPost(currentPost._id)
      if(!data.success)
      console.log(data)
      return
      console.log('asds')
      setCurrentPost(data.post)
    }
    getPost()
  },[changeFlage])
function handleEditDescribtion(e){
setDescribtion(e.target.value)
}
async function updatePost(){
  const data=await postApi.updatePost(currentPost._id,describtion)
  if(!data.success)
  console.log('error')
  console.log(data)
  setCurrentPost(data.post)
  setDescribtion(data.post.describtion)
  setEditModeFlage(false)

}
function handleCancelPostEdit(){
  setDescribtion(currentPost.describtion)
  setEditModeFlage(false)
}
async function handleDeletePost(){
  const data=await postApi.deletePost(currentPost._id)
  if(!data.success)
  console.log('')
  let user=store.get('user')

  setCurrentPost(pre=>{return {... pre,deleted:true}})
}
useEffect(()=>{
if(community)
  setCurrentCommunity(community)
  return
  if(post.community.communityId)
  communityApi.getCommunity(post.community.communityId).then(data=>setCurrentCommunity(data.community)).catch(err=>console.log(err))
},[])
console.log(author)
return (<>
            {author._id&&!currentPost.deleted?
<>
            <div  style={{ minWidth:'300px',width:'70%',maxWidth:'600px' }} className=" align-items-center card shadow border m-4 d-flex flex-column justify-start align-items-start position-relative p-2">
             {currentPost.community.communityId&&(currentCommunity.manager._id===store.get('user')._id||currentCommunity.admins.some(admin=>admin._id===store.get('user')._id))&&<div className='position-absolute d-flex justify-content-evenly ' style={{ top:'-80px',width:'100%',fontSize:'larger' }}>
                <button onClick={()=>communityApprovePost(post._id)} className="btn btn-primary">approve</button> <button onClick={()=>communityDeletePost(post._id)} className="btn btn-danger">delete</button>
              </div>}
               <div  className="w-100 d-flex flex-row flex-nowrap  justify-content-between align-items-center border-3 border-bottom ">

                <Link to={`/user/${author._id}`} style={{ width:'80%'
                }} className="  d-flex flex-nowrap  flex-row align-items-center justify-content-start align-items-start text-nowrap flex-basis-30">
                    <div style={{ width:'40px',display:'flex',height:'40px' }} className="profile-image ">

                <img  className=' border position-relative '  
                style={{ 
                  top:`${author.profileImage.style.top*6/40}px`
                  ,
                  objectFit:'contain',
                  scale:String(Number(author.profileImage.style.scale*1.3))
                   }} src={author.profileImage?`http://localhost:1000/api/user-profile-image/${author.profileImage.imageName}?userId=${author._id}`:'*'} height='100'  alt="profile-image" />  
                    </div>
                <p className='p-3' >{author.firstName} {author.lastName}</p>
                </Link>
                {currentPost.publisher===store.get('user')._id&&<div onClick={()=>setOptionListFlage(pre=>!pre)} style={{ right:'' }} className='post-options position-relative' >
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                { optionListFlage&&<span className="list-options position-absolute d-flex flex-column justify-content-center align-items-center ">
                  <span onClick={()=>setEditModeFlage(pre=>!pre)} className="list-option">
                    edit
                  </span>
                  <span onClick={handleDeletePost} className="list-option">
                    delete
                  </span>
                  </span>}
                  </div>}
            {currentPost.community.communityName?
            <Link style={{ width:'100%',height:'124.4px', }} className=' d-flex align-items-end justify-content-center pb-4 flex-basis-70' >
                <h4>{currentPost.community.communityName}</h4>
                </Link>
                :null}
               </div>
                <div style={{ width:'100%' }} className="post-body">
                  <div style={{ minWidth:'100%' }} className="d-flex  p-2 mb-3  justify-start width-100 d-flex flex-row justify-content-start ">
                  {!editModeFlage?<p ref={describtionRef}>{visibleDescribtion} 
                   {(describtion.length>50)&&<button onClick={()=>setHideDescribtionFlage(pre=>!pre)} className={`see-more-button ${!hideDescribtionFlage&&'hide'} `}> ...see more</button>}
                     <span className={`${hideDescribtionFlage&&'hide'}`}>{hiddenDescribtion}</span>   </p>:<span className=''><p>edit your post ... </p><textarea onChange={(e)=>handleEditDescribtion(e)} style={{ height:'100px',width:'100%' }} type='textArea' value={describtion} className='form-control' ></textarea>
                     <span className='d-flex justify-content-between'>  <button onClick={updatePost} className="btn">edit</button><button onClick={handleCancelPostEdit} className="btn">cancel</button></span>
                     </span> }           </div>
               {(describtion.length>50)&&<button onClick={()=>setHideDescribtionFlage(pre=>!pre)} className={` see-less-button ${hideDescribtionFlage&&'hide'}`} > see less</button>}
               {currentPost.files.length? <div style={{ width:'100%',height:shared?'200px':'400px' }} className="d-flex justify-center ">

               <img src={`http://localhost:1000/api/post-file/${currentPost.files[0].fileName}?postId=${currentPost._id}`} alt="post-photo" style={{ objectFit:'contain',width:'100%',height:'100%' }} className='border' />
                </div>:null}
                </div>
                {/* {<ShareForm ogPost={post} />} */}

                <div style={{ width:'100%' }} className=" d-flex flex-row justify-content-between pt-4 border-top border-3 mt-4 pt-2">
                <div  className="icon-holder d-flex flex-column align-items-center ">
            <span className='svg-container' onClick={handleLike}>
               {currentPost.likes.some((user)=>user===store.get('user')._id)?<img src={star} alt="star" height='20px' width='20px' />:<svg className={`${currentPost.likes.some(likeId=>likeId===store.get('user')._id)&&'liked-svg'}`}  onClick={handleStarClick} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
  <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"/>
</svg>}
              </span>
<span onClick={handleViewLikers} className='number-holder' >{currentPost.likes.length}</span>
                  </div>
<div className='icon-holder d-flex flex-column align-items-center ' >
<span  className='svg-container' >
<svg  onClick={handleViewComments} onMouseDown={updateCommentFormFlage} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
<path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
</svg>
</span>
<span onClick={handleViewComments} className='number-holder' >{numberOfComments||currentPost.comments.length}</span>
</div>
<div className='icon-holder d-flex flex-column align-items-center ' >
  <span  className='svg-container' >
  <svg   onClick={handleShareClick} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share" viewBox="0 0 16 16">
  <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
  </svg>
              </span>
  <span  className='number-holder'>{currentPost.shares.length}</span>
              </div>
              </div>
              {sharedPost._id&&!shared&&<>
              <h4 className='mt-3 mb-0  border-top border-5 pt-2 ' >{author.firstName} shared this post</h4>
              <span className="shared-post-container d-flex justify-content-center align-items-center p-3 m-3" style={{ backgroundColor:'',width:'50%',height:'40%' }}>
              <Post shared={true} post={sharedPost} updateCommentFormFlage={updateCommentFormFlage}/>
              </span>
              </>
              }
{showFormFlage&&<MakePost  sharedPostId={post._id} updateFormFlage={updateFlage} />}
              </div>
</>:currentPost.deleted?null:<h1>wait</h1>
            }
            </>
        )
}
export default Post